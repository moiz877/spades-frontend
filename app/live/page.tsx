import type { Metadata } from 'next';
import { LiveDataCard } from '@/components/LiveDataCard';

export const metadata: Metadata = {
  title: 'Live EIA Data',
  description: 'Live crude oil import data pulled directly from the EIA API v2, refreshed every 24 hours.',
};

export default function LivePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-white">Live EIA Data</h1>
      <p className="mt-2 max-w-xl text-sm text-white/60">
        Pulled directly from the EIA API v2, cached server-side for 24 hours.
      </p>
      <div className="mt-8">
        <LiveDataCard endpoint="crude-oil-imports" title="Crude Oil Imports (monthly)" />
      </div>
    </div>
  );
}
