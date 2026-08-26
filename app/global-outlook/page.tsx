import type { Metadata } from 'next';
import { SeriesExplorer } from '@/components/explorer/SeriesExplorer';

export const metadata: Metadata = {
  title: 'Global Outlook | EIA Energy Outlook Explorer',
};

export default function GlobalOutlookPage() {
  return <SeriesExplorer source="ieo" title="IEO · Global Outlook" />;
}
