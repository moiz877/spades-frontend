'use client';

import { useEffect, useState } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { CategoryTree } from './CategoryTree';
import { SeriesChart } from '@/components/charts/SeriesChart';
import { ROICalculatorOverlay } from '@/components/ROICalculatorOverlay';
import type { SeriesDocument, SeriesMeta, SeriesSource } from '@/lib/types';

const MAX_OVERLAY = 6;
const SEARCH_DEBOUNCE_MS = 300;

export function SeriesExplorer({ source, title }: { source: SeriesSource; title: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SeriesMeta[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [seriesData, setSeriesData] = useState<SeriesDocument[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ source, q: query, pageSize: '20' });
      fetch(`/api/series/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, source]);

  function toggleSeries(id: string, name: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_OVERLAY) return prev;
        next.set(id, name);
      }
      return next;
    });
  }

  useEffect(() => {
    const ids = Array.from(selected.keys());
    if (ids.length === 0) {
      setSeriesData([]);
      return;
    }
    setLoadingChart(true);
    fetch(`/api/series/compare?ids=${ids.join(',')}`)
      .then((res) => res.json())
      .then((data) => setSeriesData(data.series ?? []))
      .catch(() => setSeriesData([]))
      .finally(() => setLoadingChart(false));
  }, [selected]);

  const selectedIds = new Set(selected.keys());

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row">
      <aside className="glass-panel flex w-full shrink-0 flex-col gap-4 p-4 lg:w-80">
        <h2 className="text-sm font-semibold text-white">{title}</h2>

        <div className="relative">
          <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search series..."
            className="w-full rounded-md border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-sm text-white placeholder-white/30 outline-none focus:border-cyan-400/50"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim() ? (
            searching ? (
              <p className="px-2 py-2 text-xs text-white/40">Searching...</p>
            ) : results.length === 0 ? (
              <p className="px-2 py-2 text-xs text-white/40">No results for &quot;{query}&quot;.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {results.map((r) => (
                  <li key={r.series_id}>
                    <button
                      type="button"
                      onClick={() => toggleSeries(r.series_id, r.name)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
                        selectedIds.has(r.series_id)
                          ? 'bg-cyan-500/10 text-cyan-300'
                          : 'text-white/70 hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">{r.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <CategoryTree source={source} selectedIds={selectedIds} onToggleSeries={toggleSeries} />
          )}
        </div>
      </aside>

      <main className="glass-panel relative min-h-[28rem] flex-1 p-6">
        {seriesData.length === 1 && (
          <ROICalculatorOverlay
            seriesId={seriesData[0].series_id}
            seriesName={seriesData[0].name}
            units={seriesData[0].units}
            dataPoints={seriesData[0].data}
            currentYear={Number(seriesData[0].last_historical_period) || new Date().getFullYear()}
          />
        )}

        {selected.size > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {Array.from(selected.entries()).map(([id, name]) => (
              <span
                key={id}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
              >
                <span className="max-w-[16rem] truncate">{name}</span>
                <button type="button" onClick={() => toggleSeries(id, name)} aria-label={`Remove ${name}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {loadingChart ? (
          <div className="flex h-96 items-center justify-center text-sm text-white/40">Loading chart...</div>
        ) : (
          <SeriesChart series={seriesData} />
        )}
      </main>
    </div>
  );
}
