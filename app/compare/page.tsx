import type { Metadata } from 'next';
import { CompareExplorer } from '@/components/explorer/CompareExplorer';

export const metadata: Metadata = {
  title: 'Compare Series',
  description:
    'Build a multi-series comparison chart mixing US (AEO2026) and global (IEO) EIA energy outlook projections.',
};

export default function ComparePage() {
  return <CompareExplorer />;
}
