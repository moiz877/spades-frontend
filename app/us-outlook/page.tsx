import type { Metadata } from 'next';
import { SeriesExplorer } from '@/components/explorer/SeriesExplorer';

export const metadata: Metadata = {
  title: 'US Outlook (AEO2026)',
  description:
    'Browse and chart EIA Annual Energy Outlook 2026 projections through 2050 by category, or search across 171,000+ US energy series.',
};

export default function UsOutlookPage() {
  return <SeriesExplorer source="aeo" title="AEO2026 · US Outlook" />;
}
