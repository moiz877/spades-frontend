import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CompareExplorer } from '@/components/explorer/CompareExplorer';
import { AEO_LABEL } from '@/lib/dataVintage';

export const metadata: Metadata = {
  title: 'Compare Series',
  description: `Build a multi-series comparison chart mixing US (${AEO_LABEL}) and global (IEO) EIA energy outlook projections.`,
};

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-white/40">Loading...</div>}>
      <CompareExplorer />
    </Suspense>
  );
}
