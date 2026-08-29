import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SeriesExplorer } from '@/components/explorer/SeriesExplorer';
import { AEO_LABEL } from '@/lib/dataVintage';

export const metadata: Metadata = {
  title: `US Outlook (${AEO_LABEL})`,
  description: `Browse and chart EIA Annual Energy Outlook ${AEO_LABEL.replace('AEO', '')} projections through 2050 by category, or search across 171,000+ US energy series.`,
};

export default function UsOutlookPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-white/40">Loading...</div>}>
      <SeriesExplorer source="aeo" title={`${AEO_LABEL} · US Outlook`} />
    </Suspense>
  );
}
