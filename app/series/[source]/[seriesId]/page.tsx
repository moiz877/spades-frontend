import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCollection, isSeriesSource } from '@/lib/series';
import { AEO_LABEL } from '@/lib/dataVintage';
import type { SeriesSource } from '@/lib/types';

// Rendered on-demand per series (215k+ of these -- generating them all
// statically at build time would blow up build time/output on a free
// tier), then cached at the edge for a week. EIA republishes these
// bulk files roughly annually, so a week-old cache is never stale in
// any way that matters.
export const revalidate = 604800;
export const dynamicParams = true;

interface PageProps {
  params: { source: string; seriesId: string };
}

async function loadSeries(source: string, seriesId: string) {
  if (!isSeriesSource(source)) return null;
  const collection = await getCollection(source);
  return collection.findOne({ series_id: decodeURIComponent(seriesId) }, { projection: { _id: 0 } });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const series = await loadSeries(params.source, params.seriesId);
  if (!series) return { title: 'Series not found' };

  const sourceLabel = params.source === 'aeo' ? AEO_LABEL : 'IEO';
  return {
    title: series.name,
    description: `${series.description ?? series.name} (${series.units}), ${sourceLabel} projection through ${series.end}.`,
    openGraph: {
      title: series.name,
      description: series.description ?? undefined,
    },
  };
}

export default async function SeriesPage({ params }: PageProps) {
  const series = await loadSeries(params.source, params.seriesId);
  if (!series) notFound();

  const source = params.source as SeriesSource;
  const sourceLabel = source === 'aeo' ? `${AEO_LABEL} (US)` : 'IEO (Global)';
  const explorerHref = source === 'aeo' ? '/us-outlook' : '/global-outlook';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: series.name,
    description: series.description ?? series.name,
    identifier: series.series_id,
    temporalCoverage: `${series.start}/${series.end}`,
    creator: {
      '@type': 'Organization',
      name: 'U.S. Energy Information Administration',
      url: 'https://www.eia.gov/',
    },
    variableMeasured: series.units,
    dateModified: series.last_updated,
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="flex flex-wrap gap-1.5 text-xs text-white/40">
        <Link href={explorerHref} className="hover:text-white">
          {sourceLabel}
        </Link>
        {series.category_path.slice(0, -1).map((segment: string, i: number) => (
          <span key={i} className="flex items-center gap-1.5">
            <span>/</span>
            <span>{segment}</span>
          </span>
        ))}
      </nav>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">{series.name}</h1>
      <p className="mt-2 text-sm text-white/60">{series.description}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-white/40">Units</dt>
          <dd className="text-sm text-white/80">{series.units}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/40">Coverage</dt>
          <dd className="text-sm text-white/80">
            {series.start} to {series.end}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-white/40">Frequency</dt>
          <dd className="text-sm text-white/80">{series.frequency === 'A' ? 'Annual' : series.frequency}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/40">Last updated</dt>
          <dd className="text-sm text-white/80">{new Date(series.last_updated).toLocaleDateString()}</dd>
        </div>
      </dl>

      <div className="glass-panel mt-8 overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-white/40">
              <th className="pb-2 pr-4 font-normal">Year</th>
              <th className="pb-2 font-normal">Value ({series.units})</th>
            </tr>
          </thead>
          <tbody className="font-mono-tabular text-white/70">
            {series.data.map((point: { year: number; value: number | null }) => (
              <tr key={point.year} className="border-t border-white/5">
                <td className="py-1.5 pr-4">{point.year}</td>
                <td className="py-1.5">{point.value !== null ? point.value.toLocaleString() : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-white/30">
        Series ID: {series.series_id}. Source: U.S. Energy Information Administration.
      </p>

      <Link
        href={explorerHref}
        className="mt-4 inline-block rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 active:scale-95"
      >
        Explore and chart this series
      </Link>
    </div>
  );
}
