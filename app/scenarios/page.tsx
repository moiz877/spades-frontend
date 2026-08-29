'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash } from '@phosphor-icons/react';
import { SkeletonList } from '@/components/ui/Skeleton';

interface ScenarioSummary {
  _id: string;
  name: string;
  created_by_name: string;
  created_at: string;
  result: { npv: number; irr: number | null; payback_period_years: number | null };
}

export default function ScenariosPage() {
  const { status } = useSession();
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioSummary[] | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  function load() {
    fetch('/api/scenarios')
      .then((res) => res.json())
      .then((data) => setScenarios(data.scenarios ?? []))
      .catch(() => setScenarios([]));
  }

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [status]);

  async function handleDelete(id: string) {
    await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Saved scenarios</h1>
        <Link href="/tea-builder" className="text-sm text-cyan-400 hover:underline">
          + New scenario
        </Link>
      </div>

      <div className="glass-panel mt-6 p-4">
        {scenarios === null ? (
          <SkeletonList rows={4} />
        ) : scenarios.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">
            No scenarios saved yet. Run a TEA and save it to see it here.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {scenarios.map((s) => (
              <li key={s._id} className="flex items-center justify-between gap-4 border-t border-white/5 py-3 first:border-t-0">
                <Link href={`/tea-builder?scenario=${s._id}`} className="flex-1 min-w-0">
                  <p className="truncate text-sm text-white/90">{s.name}</p>
                  <p className="text-xs text-white/40">
                    {s.created_by_name} - {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </Link>
                <div className="flex items-center gap-4 font-mono-tabular text-xs text-white/60">
                  <span>NPV ${s.result.npv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span>{s.result.irr !== null ? `${(s.result.irr * 100).toFixed(1)}% IRR` : 'N/A'}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(s._id)}
                    className="text-white/30 transition hover:text-red-400"
                    aria-label={`Delete ${s.name}`}
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
