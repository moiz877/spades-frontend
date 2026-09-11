"""
Core techno-economic analysis math: CapEx scaling, OpEx buildup, and
discounted cash flow (NPV / IRR / payback).

Deliberately pure functions with zero I/O and zero LLM involvement --
this is the arithmetic a CFO-literate reviewer will actually check, so
it stays fully deterministic and unit-testable. The LLM (see llm/) only
ever narrates *these* numbers, never computes its own.
"""

from __future__ import annotations

from .models import OpexBreakdown, ProcessInputs, TEAResult


def scale_capex(base_capex: float, base_capacity: float, new_capacity: float, exponent: float = 0.6) -> float:
    """
    Six-tenths rule: Cost_new = Cost_base * (Capacity_new / Capacity_base) ^ exponent.
    Standard first-pass capital cost scaling for chemical process plants.
    """
    if base_capacity <= 0:
        raise ValueError("base_capacity must be positive")
    return base_capex * (new_capacity / base_capacity) ** exponent


def calculate_annual_opex(
    feedstock_costs: dict[str, float],
    utility_costs: dict[str, float],
    capex: float,
    maintenance_pct: float = 0.03,
    fixed_costs: float = 0.0,
) -> OpexBreakdown:
    """Sums feedstock + utility spend with capex-scaled maintenance and fixed costs."""
    feedstock_total = sum(feedstock_costs.values())
    utility_total = sum(utility_costs.values())
    maintenance = capex * maintenance_pct
    total = feedstock_total + utility_total + maintenance + fixed_costs

    return OpexBreakdown(
        feedstock=round(feedstock_total, 2),
        utilities=round(utility_total, 2),
        maintenance=round(maintenance, 2),
        fixed=round(fixed_costs, 2),
        total=round(total, 2),
    )


def build_cash_flows(
    capex: float,
    working_capital: float,
    base_product_revenue: float,
    base_feedstock_costs: dict[str, float],
    base_utility_costs: dict[str, float],
    non_escalating_annual_opex: float,
    lifetime_years: int,
    salvage_value: float = 0.0,
    product_escalation_pct: float = 0.0,
    feedstock_escalation_pct: dict[str, float] | None = None,
    utility_escalation_pct: dict[str, float] | None = None,
) -> list[float]:
    """
    Year 0 is the initial outlay (capex + working capital, negative).
    Years 1..N compound product revenue and each feedstock/utility cost
    at its own escalation rate (each defaulting to 0.0, which reproduces
    the original flat-price-forever MVP model exactly); maintenance and
    fixed costs are held flat since they scale with capex/labor, not a
    market price series. Working capital is recovered and salvage value
    realized in the final year.

    Escalation rates come from an OLS linear trend fit to real EIA data
    (see forecasting.py + /api/tea/benchmark), not an assumption invented
    here -- this function just compounds whatever rate it's given.
    """
    feedstock_escalation_pct = feedstock_escalation_pct or {}
    utility_escalation_pct = utility_escalation_pct or {}

    cash_flows = [-(capex + working_capital)]

    for year in range(1, lifetime_years + 1):
        years_elapsed = year - 1  # base-year (year 1) costs use the un-escalated price
        revenue = base_product_revenue * (1 + product_escalation_pct) ** years_elapsed
        feedstock_total = sum(
            cost * (1 + feedstock_escalation_pct.get(name, 0.0)) ** years_elapsed
            for name, cost in base_feedstock_costs.items()
        )
        utility_total = sum(
            cost * (1 + utility_escalation_pct.get(name, 0.0)) ** years_elapsed
            for name, cost in base_utility_costs.items()
        )
        cf = revenue - (feedstock_total + utility_total + non_escalating_annual_opex)
        if year == lifetime_years:
            cf += working_capital + salvage_value
        cash_flows.append(cf)

    return cash_flows


def npv(rate: float, cash_flows: list[float]) -> float:
    return sum(cf / (1 + rate) ** i for i, cf in enumerate(cash_flows))


def irr(cash_flows: list[float], guess: float = 0.1, tol: float = 1e-6, max_iter: int = 200) -> float | None:
    """
    Newton's method with a bisection fallback. Returns None rather than a
    wrong number if no real root is found in a sane range -- an IRR that
    doesn't exist (e.g. cash flows never turn positive) must not be
    silently reported as some arbitrary value.
    """
    rate = guess
    for _ in range(max_iter):
        npv_val = npv(rate, cash_flows)
        derivative = sum(-i * cf / (1 + rate) ** (i + 1) for i, cf in enumerate(cash_flows) if i > 0)
        if abs(derivative) < 1e-12:
            break
        new_rate = rate - npv_val / derivative
        if abs(new_rate - rate) < tol:
            return new_rate
        rate = new_rate

    # Newton didn't converge (common with unusual cash-flow shapes) --
    # fall back to bisection over a broad, economically sane range.
    lo, hi = -0.99, 10.0
    f_lo, f_hi = npv(lo, cash_flows), npv(hi, cash_flows)
    if f_lo * f_hi > 0:
        return None  # no sign change in range => no real root here

    for _ in range(200):
        mid = (lo + hi) / 2
        f_mid = npv(mid, cash_flows)
        if abs(f_mid) < 1e-6:
            return mid
        if f_lo * f_mid < 0:
            hi = mid
        else:
            lo, f_lo = mid, f_mid

    return (lo + hi) / 2


def payback_period(cash_flows: list[float]) -> float | None:
    """Years until cumulative cash flow first turns non-negative, linearly interpolated within the year."""
    cumulative = 0.0
    for i, cf in enumerate(cash_flows):
        prev_cumulative = cumulative
        cumulative += cf
        if cumulative >= 0 and prev_cumulative < 0:
            fraction = -prev_cumulative / cf if cf != 0 else 0.0
            return (i - 1) + fraction
    return None  # never pays back within the project lifetime


def run_tea(
    inputs: ProcessInputs,
    feedstock_prices: dict[str, float],
    utility_prices: dict[str, float],
) -> TEAResult:
    """
    Orchestrates the full TEA: scales capex to the requested capacity,
    prices out feedstocks/utilities at the given commodity prices, builds
    the cash-flow schedule, and computes NPV/IRR/payback.

    feedstock_prices / utility_prices are keyed by commodity_key (as used
    in ProcessInputs.feedstocks[i].commodity_key) and are $ per unit of
    that input's `unit` -- the caller (commodity_prices.py) is
    responsible for supplying prices already converted to matching units.
    """
    notes: list[str] = []

    capex = scale_capex(inputs.base_capex, inputs.base_capacity, inputs.annual_capacity, inputs.capacity_exponent)
    working_capital = capex * inputs.working_capital_pct_of_capex

    feedstock_costs: dict[str, float] = {}
    for f in inputs.feedstocks:
        price = feedstock_prices.get(f.commodity_key)
        if price is None:
            notes.append(f"No price found for feedstock '{f.name}' ({f.commodity_key}); treated as $0.")
            price = 0.0
        feedstock_costs[f.name] = f.quantity_per_year * price

    utility_costs: dict[str, float] = {}
    for u in inputs.utilities:
        price = utility_prices.get(u.commodity_key)
        if price is None:
            notes.append(f"No price found for utility '{u.name}' ({u.commodity_key}); treated as $0.")
            price = 0.0
        utility_costs[u.name] = u.quantity_per_year * price

    opex_breakdown = calculate_annual_opex(
        feedstock_costs, utility_costs, capex, inputs.maintenance_pct_of_capex, inputs.fixed_annual_costs
    )

    annual_revenue = inputs.product_price_per_unit * inputs.product_annual_volume
    non_escalating_opex = opex_breakdown.maintenance + opex_breakdown.fixed

    cash_flows = build_cash_flows(
        capex,
        working_capital,
        annual_revenue,
        feedstock_costs,
        utility_costs,
        non_escalating_opex,
        inputs.project_lifetime_years,
        inputs.salvage_value,
        product_escalation_pct=inputs.product_price_escalation_pct,
        feedstock_escalation_pct={f.name: f.escalation_pct_per_year for f in inputs.feedstocks},
        utility_escalation_pct={u.name: u.escalation_pct_per_year for u in inputs.utilities},
    )

    result_npv = npv(inputs.discount_rate, cash_flows)
    result_irr = irr(cash_flows)
    result_payback = payback_period(cash_flows)

    if result_irr is None:
        notes.append("IRR could not be computed (no sign change in cash flows over the search range).")
    if result_payback is None:
        notes.append("Project does not pay back within the given project lifetime.")

    return TEAResult(
        total_capex=round(capex, 2),
        working_capital=round(working_capital, 2),
        annual_revenue=round(annual_revenue, 2),
        opex_breakdown=opex_breakdown,
        cash_flows=[round(cf, 2) for cf in cash_flows],
        npv=round(result_npv, 2),
        irr=round(result_irr, 4) if result_irr is not None else None,
        payback_period_years=round(result_payback, 2) if result_payback is not None else None,
        notes=notes,
    )
