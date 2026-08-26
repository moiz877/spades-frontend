import type { Metadata } from 'next';
import { SeriesExplorer } from '@/components/explorer/SeriesExplorer';

export const metadata: Metadata = {
  title: 'US Outlook | EIA Energy Outlook Explorer',
};

export default function UsOutlookPage() {
  return <SeriesExplorer source="aeo" title="AEO2026 · US Outlook" />;
}
