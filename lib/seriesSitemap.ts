import type { MetadataRoute } from 'next';
import { getCollection } from './series';
import type { SeriesSource } from './types';

/** Google's own limit per sitemap file. */
export const SITEMAP_CHUNK_SIZE = 50000;

/** Everything that isn't a per-series page. Always occupies the front of chunk 0. */
export const STATIC_ROUTES = ['', '/tea-builder', '/us-outlook', '/global-outlook', '/live', '/compare'];

interface SeriesSitemapDoc {
  series_id: string;
  last_updated?: string;
}

function seriesEntry(siteUrl: string, source: SeriesSource, doc: SeriesSitemapDoc): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}/series/${source}/${encodeURIComponent(doc.series_id)}`,
    lastModified: doc.last_updated ? new Date(doc.last_updated) : new Date(),
    changeFrequency: 'yearly',
    priority: 0.4,
  };
}

/** Total number of 50k-URL sitemap files needed to cover every static route + every series. */
export async function getSitemapChunkCount(): Promise<number> {
  const [aeoTotal, ieoTotal] = await Promise.all([
    (await getCollection('aeo')).estimatedDocumentCount(),
    (await getCollection('ieo')).estimatedDocumentCount(),
  ]);
  const totalUrls = STATIC_ROUTES.length + aeoTotal + ieoTotal;
  return Math.max(1, Math.ceil(totalUrls / SITEMAP_CHUNK_SIZE));
}

/**
 * Returns the URL entries for one sitemap chunk. URL space is laid out as:
 * [0, STATIC_ROUTES.length) = static routes, then [that, +aeoTotal) = AEO
 * series sorted by series_id, then the remainder = IEO series. Each chunk
 * is a contiguous SITEMAP_CHUNK_SIZE-wide slice of that space.
 */
export async function getSitemapChunk(chunkId: number, siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const startIndex = chunkId * SITEMAP_CHUNK_SIZE;
  const endIndexExclusive = startIndex + SITEMAP_CHUNK_SIZE;
  const entries: MetadataRoute.Sitemap = [];

  if (startIndex < STATIC_ROUTES.length) {
    const slice = STATIC_ROUTES.slice(startIndex, Math.min(endIndexExclusive, STATIC_ROUTES.length));
    for (const route of slice) {
      entries.push({
        url: `${siteUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'weekly' : 'daily',
        priority: route === '' ? 1 : 0.7,
      });
    }
  }

  const staticConsumedInChunk = Math.max(0, Math.min(endIndexExclusive, STATIC_ROUTES.length) - startIndex);
  const seriesSlotStart = Math.max(0, startIndex - STATIC_ROUTES.length);
  const seriesSlotsNeeded = SITEMAP_CHUNK_SIZE - staticConsumedInChunk;

  if (seriesSlotsNeeded > 0) {
    const aeoCollection = await getCollection('aeo');
    const aeoTotal = await aeoCollection.estimatedDocumentCount();

    let cursor = seriesSlotStart;
    let remaining = seriesSlotsNeeded;

    if (cursor < aeoTotal) {
      const take = Math.min(remaining, aeoTotal - cursor);
      const docs = await aeoCollection
        .find({}, { projection: { series_id: 1, last_updated: 1, _id: 0 } })
        .sort({ series_id: 1 })
        .skip(cursor)
        .limit(take)
        .toArray();
      for (const doc of docs) entries.push(seriesEntry(siteUrl, 'aeo', doc as SeriesSitemapDoc));
      remaining -= docs.length;
      cursor = aeoTotal;
    }

    if (remaining > 0) {
      const ieoCollection = await getCollection('ieo');
      const ieoSkip = cursor - aeoTotal;
      const docs = await ieoCollection
        .find({}, { projection: { series_id: 1, last_updated: 1, _id: 0 } })
        .sort({ series_id: 1 })
        .skip(ieoSkip)
        .limit(remaining)
        .toArray();
      for (const doc of docs) entries.push(seriesEntry(siteUrl, 'ieo', doc as SeriesSitemapDoc));
    }
  }

  return entries;
}
