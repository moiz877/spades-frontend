import type { Metadata } from 'next';
import { CompareExplorer } from '@/components/explorer/CompareExplorer';

export const metadata: Metadata = {
  title: 'Compare | EIA Energy Outlook Explorer',
};

export default function ComparePage() {
  return <CompareExplorer />;
}
