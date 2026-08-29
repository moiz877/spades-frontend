/**
 * TypeScript mirror of pdf-service/tea_engine/models.py's Pydantic
 * schemas. Source of truth for the shapes is the Python side -- keep
 * these two in sync by hand when either changes.
 */

export interface FeedstockInput {
  name: string;
  commodity_key: string;
  quantity_per_year: number;
  unit: string;
  price_override?: number | null;
}

export interface UtilityInput {
  name: string;
  commodity_key: string;
  quantity_per_year: number;
  unit: string;
  price_override?: number | null;
}

export interface ProcessInputs {
  process_name: string;
  base_capex: number;
  base_capacity: number;
  annual_capacity: number;
  capacity_unit: string;
  capacity_exponent: number;
  feedstocks: FeedstockInput[];
  utilities: UtilityInput[];
  maintenance_pct_of_capex: number;
  fixed_annual_costs: number;
  product_price_per_unit: number;
  product_annual_volume: number;
  product_unit: string;
  working_capital_pct_of_capex: number;
  salvage_value: number;
  project_lifetime_years: number;
  discount_rate: number;
}

export interface OpexBreakdown {
  feedstock: number;
  utilities: number;
  maintenance: number;
  fixed: number;
  total: number;
}

export interface TEAResult {
  total_capex: number;
  working_capital: number;
  annual_revenue: number;
  opex_breakdown: OpexBreakdown;
  cash_flows: number[];
  npv: number;
  irr: number | null;
  payback_period_years: number | null;
  notes: string[];
}

export interface SensitivityRow {
  parameter: string;
  low_npv: number;
  base_npv: number;
  high_npv: number;
}

export interface RunTeaResponse {
  result: TEAResult;
  sensitivity?: SensitivityRow[];
}

export const DEFAULT_PROCESS_INPUTS: ProcessInputs = {
  process_name: '',
  base_capex: 5_000_000,
  base_capacity: 20_000,
  annual_capacity: 30_000,
  capacity_unit: 'metric_ton',
  capacity_exponent: 0.6,
  feedstocks: [],
  utilities: [],
  maintenance_pct_of_capex: 0.03,
  fixed_annual_costs: 0,
  product_price_per_unit: 1000,
  product_annual_volume: 30_000,
  product_unit: 'metric_ton',
  working_capital_pct_of_capex: 0.15,
  salvage_value: 0,
  project_lifetime_years: 15,
  discount_rate: 0.1,
};
