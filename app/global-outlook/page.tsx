import type { Metadata } from 'next';
import { SeriesExplorer } from '@/components/explorer/SeriesExplorer';

export const metadata: Metadata = {
  title: 'Global Outlook (IEO)',
  description:
    'Browse and chart EIA International Energy Outlook projections by region and scenario, covering global and regional energy demand through 2050.',
};

export default function GlobalOutlookPage() {
  return <SeriesExplorer source="ieo" title="IEO · Global Outlook" />;
}
