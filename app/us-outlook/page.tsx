import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SeriesExplorer } from '@/components/explorer/SeriesExplorer';

export const metadata: Metadata = {
  title: 'US Outlook (AEO2026)',
  description:
    'Browse and chart EIA Annual Energy Outlook 2026 projections through 2050 by category, or search across 171,000+ US energy series.',
};

export default function UsOutlookPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-white/40">Loading...</div>}>
      <SeriesExplorer source="aeo" title="AEO2026 · US Outlook" />
    </Suspense>
  );
}
