"""
Pydantic schemas for the TEA (techno-economic analysis) engine.

These are the contract between the frontend's process-input form and
calculations.py's math. Nothing here does arithmetic or touches a
network/database -- pure data shapes only.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class FeedstockInput(BaseModel):
    """One raw-material input consumed by the process, e.g. sulfuric acid."""

    name: str
    commodity_key: str = Field(description="Key into the commodity_prices cache, e.g. 'sulfuric_acid'.")
    quantity_per_year: float = Field(gt=0, description="Annual consumption.")
    unit: str = Field(description="Unit for quantity_per_year, e.g. 'metric_ton'.")


class UtilityInput(BaseModel):
    """One utility input, e.g. electricity or natural gas."""

    name: str
    commodity_key: str = Field(description="Key into the commodity_prices cache, e.g. 'electricity'.")
    quantity_per_year: float = Field(gt=0)
    unit: str = Field(description="Unit for quantity_per_year, e.g. 'MWh'.")


class ProcessInputs(BaseModel):
    """Everything needed to run a TEA on one process/plant configuration."""

    process_name: str

    # Capital cost scaling (six-tenths rule): a known reference plant's
    # cost and capacity, scaled to the requested capacity.
    base_capex: float = Field(gt=0, description="Known installed cost of a reference plant.")
    base_capacity: float = Field(gt=0, description="That reference plant's annual capacity.")
    annual_capacity: float = Field(gt=0, description="Capacity of the plant being evaluated.")
    capacity_unit: str
    capacity_exponent: float = Field(default=0.6, gt=0, lt=1, description="Six-tenths rule exponent.")

    feedstocks: list[FeedstockInput] = Field(default_factory=list)
    utilities: list[UtilityInput] = Field(default_factory=list)

    maintenance_pct_of_capex: float = Field(default=0.03, ge=0, le=1)
    fixed_annual_costs: float = Field(default=0.0, ge=0, description="Labor, insurance, etc.")

    product_price_per_unit: float = Field(gt=0)
    product_annual_volume: float = Field(gt=0)
    product_unit: str

    working_capital_pct_of_capex: float = Field(default=0.15, ge=0, le=1)
    salvage_value: float = Field(default=0.0, ge=0)

    project_lifetime_years: int = Field(gt=0, le=50, default=15)
    discount_rate: float = Field(gt=0, lt=1, default=0.10)


class OpexBreakdown(BaseModel):
    feedstock: float
    utilities: float
    maintenance: float
    fixed: float
    total: float


class TEAResult(BaseModel):
    """Output of run_tea() -- everything the report/UI needs to render."""

    total_capex: float
    working_capital: float
    annual_revenue: float
    opex_breakdown: OpexBreakdown
    cash_flows: list[float] = Field(description="Year 0 (= -capex) through project_lifetime_years.")
    npv: float
    irr: float | None = Field(description="None if no real root was found in the search range.")
    payback_period_years: float | None = Field(description="None if the project never pays back.")
    notes: list[str] = Field(default_factory=list, description="Caveats surfaced to the report/UI.")
