/**
 * TypeScript mirror of pdf-service/tea_engine/forecasting.py's OLS fit --
 * same closed-form linear regression, same "need at least 3 points, plain
 * least squares, no invented distribution shape" reasoning. Duplicated
 * rather than called cross-language because this route already has the
 * series' {year, value} pairs in hand from Mongo and it's five lines of
 * arithmetic -- not worth a network hop to pdf-service for.
 */

export interface PriceTrend {
  slope: number;
  intercept: number;
  rSquared: number;
  annualGrowthRate: number;
  pointCount: number;
}

export function fitPriceTrend(points: { year: number; value: number | null }[]): PriceTrend | null {
  const usable = points.filter((p): p is { year: number; value: number } => p.value !== null);
  const n = usable.length;
  if (n < 3) return null;

  const meanX = usable.reduce((sum, p) => sum + p.year, 0) / n;
  const meanY = usable.reduce((sum, p) => sum + p.value, 0) / n;

  const varX = usable.reduce((sum, p) => sum + (p.year - meanX) ** 2, 0);
  if (varX === 0) return null;

  const covariance = usable.reduce((sum, p) => sum + (p.year - meanX) * (p.value - meanY), 0);
  const slope = covariance / varX;
  const intercept = meanY - slope * meanX;

  const ssTotal = usable.reduce((sum, p) => sum + (p.value - meanY) ** 2, 0);
  const ssResidual = usable.reduce((sum, p) => sum + (p.value - (slope * p.year + intercept)) ** 2, 0);
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  const annualGrowthRate = meanY !== 0 ? slope / meanY : 0;

  return { slope, intercept, rSquared, annualGrowthRate, pointCount: n };
}
