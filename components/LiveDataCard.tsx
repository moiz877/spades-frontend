'use client';

import { useEffect, useState } from 'react';
import { ArrowsClockwise, Broadcast } from '@phosphor-icons/react';
import { Glow } from '@/components/ui/Glow';
import { SkeletonTable } from '@/components/ui/Skeleton';

interface LiveResponse {
  data?: unknown;
  error?: string;
  lastUpdated?: string;
  fromCache?: boolean;
  stale?: boolean;
}

export function LiveDataCard({ endpoint, title }: { endpoint: string; title: string }) {
  const [state, setState] = useState<LiveResponse | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch(`/api/live/${endpoint}`)
      .then((res) => res.json())
      .then((data) => setState(data))
      .catch((err) => setState({ error: String(err) }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const rows = Array.isArray((state?.data as { response?: { data?: unknown[] } })?.response?.data)
    ? ((state!.data as { response: { data: Record<string, unknown>[] } }).response.data)
    : [];

  return (
    <div className="glass-panel relative flex flex-col gap-4 p-6">
      <Glow className="right-0 top-0 h-48 w-48 -translate-y-1/3" />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/60 transition hover:border-white/20 hover:text-white active:scale-95"
        >
          <ArrowsClockwise size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {state?.error ? (
        <p className="text-sm text-red-400">{state.error}</p>
      ) : loading && !state ? (
        <SkeletonTable rows={6} columns={5} />
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="relative flex h-2 w-2">
              {!state?.fromCache && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${state?.fromCache ? 'bg-amber-400' : 'bg-emerald-400'}`}
              />
            </span>
            {state?.lastUpdated ? (
              <span>
                Last updated {new Date(state.lastUpdated).toLocaleString()}
                {state.fromCache ? ' (cached)' : ''}
                {state.stale ? ' - stale, EIA API unreachable' : ''}
              </span>
            ) : (
              <span>No data yet.</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Broadcast size={28} className="text-white/15" />
                <p className="text-sm text-white/40">No rows returned for this window.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-white/40">
                    {Object.keys(rows[0]).slice(0, 5).map((key) => (
                      <th key={key} className="pb-2 pr-4 font-normal">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono-tabular text-white/70">
                  {rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-t border-white/5">
                      {Object.keys(rows[0]).slice(0, 5).map((key) => (
                        <td key={key} className="py-1.5 pr-4">
                          {String(row[key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
