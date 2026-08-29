import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SeriesExplorer } from '@/components/explorer/SeriesExplorer';

export const metadata: Metadata = {
  title: 'Global Outlook (IEO)',
  description:
    'Browse and chart EIA International Energy Outlook projections by region and scenario, covering global and regional energy demand through 2050.',
};

export default function GlobalOutlookPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-white/40">Loading...</div>}>
      <SeriesExplorer source="ieo" title="IEO · Global Outlook" />
    </Suspense>
  );
}
