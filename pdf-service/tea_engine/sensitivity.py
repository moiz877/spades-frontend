"""
Deterministic sensitivity analysis (tornado-chart data), not Monte Carlo.

A true Monte Carlo needs real probability distributions for each input
(what's the actual uncertainty on a feedstock price six months out?) that
we don't have data to justify yet -- faking a distribution shape would be
worse than not having one. A tornado analysis (vary each input +/-X% one
at a time, hold everything else at its base case, see how NPV moves) is
the standard first-pass TEA screening technique and needs no invented
distributions: it just runs run_tea() repeatedly with one input perturbed.
"""

from __future__ import annotations

from dataclasses import dataclass

from .calculations import run_tea
from .models import ProcessInputs


@dataclass
class SensitivityRow:
    parameter: str
    low_npv: float
    base_npv: float
    high_npv: float


def run_sensitivity(
    inputs: ProcessInputs,
    feedstock_prices: dict[str, float],
    utility_prices: dict[str, float],
    vary_pct: float = 0.20,
) -> list[SensitivityRow]:
    """
    Varies base_capex, product_price_per_unit, and each feedstock/utility
    price by +/-vary_pct (one at a time), returning the resulting NPV
    range for each -- exactly the data a tornado chart needs, sorted by
    swing size (widest first) so the frontend can render it pre-sorted.
    """
    base_result = run_tea(inputs, feedstock_prices, utility_prices)
    base_npv = base_result.npv

    rows: list[SensitivityRow] = []

    def npv_with(**overrides) -> float:
        updated = inputs.model_copy(update=overrides)
        return run_tea(updated, feedstock_prices, utility_prices).npv

    # --- CapEx ---
    rows.append(
        SensitivityRow(
            parameter="Capital cost",
            low_npv=npv_with(base_capex=inputs.base_capex * (1 - vary_pct)),
            base_npv=base_npv,
            high_npv=npv_with(base_capex=inputs.base_capex * (1 + vary_pct)),
        )
    )

    # --- Product price ---
    rows.append(
        SensitivityRow(
            parameter="Product price",
            low_npv=npv_with(product_price_per_unit=inputs.product_price_per_unit * (1 - vary_pct)),
            base_npv=base_npv,
            high_npv=npv_with(product_price_per_unit=inputs.product_price_per_unit * (1 + vary_pct)),
        )
    )

    # --- Each feedstock price, one at a time ---
    for i, feedstock in enumerate(inputs.feedstocks):
        low_prices = dict(feedstock_prices)
        high_prices = dict(feedstock_prices)
        base_price = feedstock_prices.get(feedstock.commodity_key, 0.0)
        low_prices[feedstock.commodity_key] = base_price * (1 - vary_pct)
        high_prices[feedstock.commodity_key] = base_price * (1 + vary_pct)

        rows.append(
            SensitivityRow(
                parameter=f"{feedstock.name} price",
                low_npv=run_tea(inputs, low_prices, utility_prices).npv,
                base_npv=base_npv,
                high_npv=run_tea(inputs, high_prices, utility_prices).npv,
            )
        )

    # --- Each utility price, one at a time ---
    for utility in inputs.utilities:
        low_prices = dict(utility_prices)
        high_prices = dict(utility_prices)
        base_price = utility_prices.get(utility.commodity_key, 0.0)
        low_prices[utility.commodity_key] = base_price * (1 - vary_pct)
        high_prices[utility.commodity_key] = base_price * (1 + vary_pct)

        rows.append(
            SensitivityRow(
                parameter=f"{utility.name} price",
                low_npv=run_tea(inputs, feedstock_prices, low_prices).npv,
                base_npv=base_npv,
                high_npv=run_tea(inputs, feedstock_prices, high_prices).npv,
            )
        )

    rows.sort(key=lambda r: abs(r.high_npv - r.low_npv), reverse=True)
    return rows
