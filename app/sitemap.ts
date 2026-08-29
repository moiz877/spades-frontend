import type { MetadataRoute } from 'next';
import { getSitemapChunk, getSitemapChunkCount, STATIC_ROUTES } from '@/lib/seriesSitemap';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Re-check chunk counts / regenerate URLs weekly rather than on every
// crawler hit -- series counts barely change between EIA data releases.
export const revalidate = 604800;

export async function generateSitemaps() {
  try {
    const count = await getSitemapChunkCount();
    return Array.from({ length: count }, (_, id) => ({ id }));
  } catch (err) {
    // Build/dev environments without a reachable MongoDB (e.g. no
    // MONGO_URI set) must still be able to build -- fall back to a
    // single chunk covering just the static routes, not the series.
    console.warn('generateSitemaps: falling back to 1 chunk (DB unreachable):', err);
    return [{ id: 0 }];
  }
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  try {
    return await getSitemapChunk(id, SITE_URL);
  } catch (err) {
    console.warn('sitemap: falling back to static routes only (DB unreachable):', err);
    return STATIC_ROUTES.map((route) => ({
      url: `${SITE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: route === '' ? 'weekly' : 'daily',
      priority: route === '' ? 1 : 0.7,
    }));
  }
}
