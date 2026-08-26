// MUST MATCH pdf-service/main.py::calculate_roi_delta exactly. If these two
// drift, the chart a user sees and the PDF they download will disagree,
// an instant credibility loss with a CFO-literate reviewer. Any edit here
// needs the matching edit there, and vice versa.

export interface DataPoint {
  year: number;
  value: number | null;
}

export interface ROIRow {
  year: number;
  baselineCost: number;
  projectedCost: number;
  delta: number;
}

/**
 * baselineCost = consumption held flat at currentYear's price.
 * projectedCost = consumption * that year's EIA-projected price.
 * delta = projectedCost - baselineCost.
 */
export function calculateROIDelta(
  dataPoints: DataPoint[],
  consumptionMwh: number,
  currentYear: number,
  horizonYears: number = 10
): ROIRow[] {
  const byYear = new Map(
    dataPoints.filter((d) => d.value !== null).map((d) => [d.year, d.value as number])
  );
  const basePrice = byYear.get(currentYear);
  if (basePrice === undefined) {
    throw new Error(`No price data for base year ${currentYear}`);
  }
  const baselineAnnualCost = consumptionMwh * basePrice;

  const results: ROIRow[] = [];
  for (let year = currentYear; year <= currentYear + horizonYears; year++) {
    const price = byYear.get(year);
    if (price === undefined) continue;
    const projectedCost = consumptionMwh * price;
    results.push({
      year,
      baselineCost: Math.round(baselineAnnualCost * 100) / 100,
      projectedCost: Math.round(projectedCost * 100) / 100,
      delta: Math.round((projectedCost - baselineAnnualCost) * 100) / 100,
    });
  }
  return results;
}

export function tenYearDelta(rows: ROIRow[]): number {
  return rows.reduce((sum, r) => sum + r.delta, 0);
}
