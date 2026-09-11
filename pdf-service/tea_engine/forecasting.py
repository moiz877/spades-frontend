"""
Linear trend fitting for price escalation forecasting.

This is genuine statistics/ML (ordinary least squares regression), not a
templated narrative -- it's what makes the "price benchmarking" feature
actually change the TEA's numbers rather than just display context. It's
implemented as plain closed-form OLS (no numpy/scikit-learn) because a
two-variable linear regression has no need for either: adding a new
dependency to save five lines of arithmetic isn't worth it, and it keeps
this free forever with zero external calls.

Deliberately NOT more sophisticated than linear (no ARIMA, no neural
forecasting): a two-variable OLS on ~20-30 annual data points is honest
about what the data can support. A fancier model on this little data
would be overfitting dressed up as rigor.
"""

from __future__ import annotations

from pydantic import BaseModel


class PriceTrend(BaseModel):
    """Fitted linear trend: value ~= slope * year + intercept."""

    slope: float
    intercept: float
    r_squared: float
    annual_growth_rate: float  # slope as a fraction of the mean value -- an approximate CAGR
    point_count: int


def fit_price_trend(data_points: list[dict]) -> PriceTrend | None:
    """
    Ordinary least squares regression of value on year. Returns None if
    there are fewer than 3 usable points (not enough to say anything
    about the earlier "we don't have data to justify a distribution
    shape" principle sensitivity.py already documents -- same standard
    applies here).
    """
    points = [(p["year"], p["value"]) for p in data_points if p.get("value") is not None]
    n = len(points)
    if n < 3:
        return None

    mean_x = sum(x for x, _ in points) / n
    mean_y = sum(y for _, y in points) / n

    var_x = sum((x - mean_x) ** 2 for x, _ in points)
    if var_x == 0:
        return None  # all points at the same year -- no trend is fittable

    covariance = sum((x - mean_x) * (y - mean_y) for x, y in points)
    slope = covariance / var_x
    intercept = mean_y - slope * mean_x

    ss_total = sum((y - mean_y) ** 2 for _, y in points)
    ss_residual = sum((y - (slope * x + intercept)) ** 2 for x, y in points)
    r_squared = 1 - (ss_residual / ss_total) if ss_total > 0 else 0.0

    annual_growth_rate = (slope / mean_y) if mean_y != 0 else 0.0

    return PriceTrend(
        slope=slope,
        intercept=intercept,
        r_squared=r_squared,
        annual_growth_rate=annual_growth_rate,
        point_count=n,
    )


def project_value(trend: PriceTrend, year: int) -> float:
    """Point estimate for a given year from the fitted line."""
    return trend.slope * year + trend.intercept
