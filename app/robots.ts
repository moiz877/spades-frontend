import type { MetadataRoute } from 'next';
import { getSitemapChunkCount } from '@/lib/seriesSitemap';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const revalidate = 604800;

export default async function robots(): Promise<MetadataRoute.Robots> {
  let chunkCount = 1;
  try {
    chunkCount = await getSitemapChunkCount();
  } catch (err) {
    console.warn('robots: falling back to 1 sitemap chunk (DB unreachable):', err);
  }
  const sitemaps = Array.from({ length: chunkCount }, (_, id) => `${SITE_URL}/sitemap/${id}.xml`);

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/team/', '/accept-invite/'],
      },
    ],
    sitemap: sitemaps,
  };
}
