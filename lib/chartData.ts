import type { SeriesDocument } from './types';

export interface ChartRow {
  year: number;
  [seriesId: string]: number | null;
}

/** Distinct, colorblind-tolerable palette for overlaying multiple series. */
export const SERIES_COLORS = ['#22d3ee', '#f97316', '#a78bfa', '#34d399', '#f472b6', '#facc15'];

/** Merge multiple series' [{year, value}] arrays into one year-indexed table for recharts. */
export function mergeSeriesForChart(series: SeriesDocument[]): ChartRow[] {
  const years = new Set<number>();
  for (const s of series) {
    for (const point of s.data) years.add(point.year);
  }

  const sortedYears = Array.from(years).sort((a, b) => a - b);

  return sortedYears.map((year) => {
    const row: ChartRow = { year };
    for (const s of series) {
      const point = s.data.find((p) => p.year === year);
      row[s.series_id] = point?.value ?? null;
    }
    return row;
  });
}
