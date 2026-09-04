"""
Auto-generated executive-summary narrative for a TEA run.

This is deliberately rule-based, not an LLM call: there is no LLM API key
wired into this service, and inventing one here would mean a new secret,
a new per-request cost, and prose that can't be unit-tested for
correctness against the actual numbers. A templated narrative keyed off
the real NPV/IRR/payback/tornado values is free, deterministic, and never
says something the math didn't produce -- if a real LLM-authored summary
is wanted later, this module is the natural seam to swap in that call
without touching calculations.py or the frontend contract.
"""

from __future__ import annotations

from pydantic import BaseModel

from .models import ProcessInputs, TEAResult
from .sensitivity import SensitivityRow

DEFAULT_IRR_HURDLE_PCT = 0.15
DEFAULT_PAYBACK_HURDLE_YEARS = 5.0


class HurdleComparison(BaseModel):
    irr_hurdle_pct: float
    payback_hurdle_years: float
    meets_irr_hurdle: bool | None  # None if IRR itself is None (no positive-return root found)
    meets_payback_hurdle: bool | None  # None if project never pays back


class NarrativeSections(BaseModel):
    verdict: str  # "positive" | "marginal" | "negative"
    executive_summary: str
    key_risks: list[str]
    recommendations: list[str]
    hurdle_comparison: HurdleComparison


def _format_money(value: float) -> str:
    return f"${value:,.0f}"


def _classify_verdict(result: TEAResult, irr_hurdle_pct: float) -> str:
    if result.npv <= 0:
        return "negative"
    if result.irr is not None and result.irr >= irr_hurdle_pct:
        return "positive"
    return "marginal"


def _executive_summary(inputs: ProcessInputs, result: TEAResult, verdict: str, hurdle: HurdleComparison) -> str:
    name = inputs.process_name or "This process"
    npv_str = _format_money(result.npv)
    irr_str = f"{result.irr * 100:.1f}%" if result.irr is not None else "not calculable (no year ever recovers the investment)"

    if verdict == "positive":
        lede = (
            f"{name} is NPV-positive at {npv_str} over {inputs.project_lifetime_years} years, "
            f"with an IRR of {irr_str} that clears the {hurdle.irr_hurdle_pct * 100:.0f}% hurdle rate used here."
        )
    elif verdict == "marginal":
        lede = (
            f"{name} is NPV-positive at {npv_str}, but its IRR of {irr_str} falls short of the "
            f"{hurdle.irr_hurdle_pct * 100:.0f}% hurdle rate used here -- the project clears zero but may not "
            f"clear your actual cost of capital."
        )
    else:
        lede = (
            f"{name} is NPV-negative at {npv_str} over {inputs.project_lifetime_years} years: at the assumed "
            f"prices and volumes, this project destroys value rather than creating it."
        )

    if result.payback_period_years is not None:
        payback_clause = f" Payback occurs in {result.payback_period_years:.1f} years."
    else:
        payback_clause = " The project never pays back within the modeled lifetime."
    return lede + payback_clause


def _key_risks(sensitivity: list[SensitivityRow], base_npv: float) -> list[str]:
    if not sensitivity:
        return []
    risks: list[str] = []
    for row in sensitivity[:3]:
        swing = abs(row.high_npv - row.low_npv)
        crosses_zero = (row.low_npv < 0) != (row.high_npv < 0)
        detail = (
            f"{row.parameter}: a +/-20% move swings NPV by {_format_money(swing)}"
            f" (from {_format_money(row.low_npv)} to {_format_money(row.high_npv)})"
        )
        if crosses_zero:
            detail += " -- this alone can flip the project from value-creating to value-destroying."
        risks.append(detail)
    return risks


def _recommendations(inputs: ProcessInputs, result: TEAResult, sensitivity: list[SensitivityRow], verdict: str) -> list[str]:
    recs: list[str] = []

    if sensitivity:
        top = sensitivity[0]
        if "price" in top.parameter.lower() and "product" not in top.parameter.lower():
            recs.append(
                f"{top.parameter} is the single largest driver of outcome uncertainty. Consider a fixed-price "
                "or hedged supply contract to remove this swing rather than carrying it as open exposure."
            )
        elif top.parameter == "Capital cost":
            recs.append(
                "Capital cost is the top driver of NPV variance. Tightening the CapEx estimate (a vendor "
                "quote rather than the six-tenths scaling estimate) would meaningfully de-risk this analysis "
                "before committing capital."
            )
        elif top.parameter == "Product price":
            recs.append(
                "Product price is the top driver of NPV variance -- the project's economics lean heavily on "
                "achieving the assumed selling price. Stress-test this against realistic contract or spot-market terms."
            )

    if verdict == "negative":
        recs.append(
            "At current assumptions this project does not clear zero NPV. Revisit capacity (economies of "
            "scale via the six-tenths rule cut CapEx/unit at larger scale), product price, or feedstock "
            "sourcing before proceeding."
        )
    elif verdict == "marginal":
        recs.append(
            "NPV is positive but IRR does not clear the hurdle rate used here. If your actual cost of capital "
            "is lower than the hurdle modeled, this project may already be attractive -- re-run with your "
            "real hurdle rate to confirm."
        )
    elif result.payback_period_years is not None and result.payback_period_years > inputs.project_lifetime_years / 2:
        recs.append(
            f"Payback of {result.payback_period_years:.1f} years consumes more than half the modeled "
            f"{inputs.project_lifetime_years}-year project life -- confirm the asset's useful life and any "
            "residual/salvage assumptions support that timeline."
        )

    if not recs:
        recs.append(
            "No single input dominates the outcome and the project clears its hurdle rate -- this is a "
            "comparatively low-risk case among typical TEA screenings."
        )

    return recs


def generate_narrative(
    inputs: ProcessInputs,
    result: TEAResult,
    sensitivity: list[SensitivityRow],
    irr_hurdle_pct: float = DEFAULT_IRR_HURDLE_PCT,
    payback_hurdle_years: float = DEFAULT_PAYBACK_HURDLE_YEARS,
) -> NarrativeSections:
    hurdle = HurdleComparison(
        irr_hurdle_pct=irr_hurdle_pct,
        payback_hurdle_years=payback_hurdle_years,
        meets_irr_hurdle=(result.irr >= irr_hurdle_pct) if result.irr is not None else None,
        meets_payback_hurdle=(
            (result.payback_period_years <= payback_hurdle_years) if result.payback_period_years is not None else None
        ),
    )
    verdict = _classify_verdict(result, irr_hurdle_pct)

    return NarrativeSections(
        verdict=verdict,
        executive_summary=_executive_summary(inputs, result, verdict, hurdle),
        key_risks=_key_risks(sensitivity, result.npv),
        recommendations=_recommendations(inputs, result, sensitivity, verdict),
        hurdle_comparison=hurdle,
    )
