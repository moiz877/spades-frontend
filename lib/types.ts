export interface SeriesDataPoint {
  year: number;
  value: number | null;
}

/** Full series document as stored in aeo_series / ieo_series. */
export interface SeriesDocument {
  series_id: string;
  name: string;
  units: string;
  frequency: string;
  description: string;
  start: string;
  end: string;
  last_historical_period: string;
  last_updated: string;
  category_path: string[];
  data: SeriesDataPoint[];
}

/** Lightweight metadata used in list/search views — no data array. */
export type SeriesMeta = Omit<SeriesDocument, 'data'>;

export type SeriesSource = 'aeo' | 'ieo';
