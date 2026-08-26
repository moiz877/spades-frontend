import type { Collection } from 'mongodb';
import { getDb } from './mongodb';
import type { SeriesDocument, SeriesSource } from './types';

const COLLECTIONS: Record<SeriesSource, string> = {
  aeo: 'aeo_series',
  ieo: 'ieo_series',
};

export function isSeriesSource(value: unknown): value is SeriesSource {
  return value === 'aeo' || value === 'ieo';
}

/** series_id is always prefixed "AEO." or "IEO." — infer which collection it lives in. */
export function inferSourceFromId(seriesId: string): SeriesSource | null {
  if (seriesId.startsWith('AEO.')) return 'aeo';
  if (seriesId.startsWith('IEO.')) return 'ieo';
  return null;
}

export async function getCollection(source: SeriesSource): Promise<Collection<SeriesDocument>> {
  const db = await getDb();
  return db.collection<SeriesDocument>(COLLECTIONS[source]);
}
