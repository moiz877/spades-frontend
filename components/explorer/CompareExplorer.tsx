'use client';

import { useEffect, useState } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { CategoryTree } from './CategoryTree';
import { SeriesChart } from '@/components/charts/SeriesChart';
import { useCompareGate } from '@/lib/leadGateStore';
import type { SeriesDocument, SeriesMeta, SeriesSource } from '@/lib/types';

const MAX_OVERLAY = 6;
const SEARCH_DEBOUNCE_MS = 300;

const SOURCE_LABELS: Record<SeriesSource, string> = {
  aeo: 'AEO2026 (US)',
  ieo: 'IEO (Global)',
};

export function CompareExplorer() {
  const [activeSource, setActiveSource] = useState<SeriesSource>('aeo');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SeriesMeta[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [seriesData, setSeriesData] = useState<SeriesDocument[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const { attemptCompare } = useCompareGate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ source: activeSource, q: query, pageSize: '20' });
      fetch(`/api/series/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, activeSource]);

  function toggleSeries(id: string, name: string) {
    if (selected.has(id)) {
      setSelected((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    if (selected.size >= MAX_OVERLAY) return;

    // Gate the 3rd+ concurrent comparison. attemptCompare has side effects
    // (localStorage), so it's called here against the current render's
    // `selected` rather than inside a setState updater, which React may
    // invoke more than once.
    const wouldBeIds = [...selected.keys(), id];
    if (wouldBeIds.length >= 3 && !attemptCompare(wouldBeIds)) {
      return; // gated — the lead-gate modal is already open
    }

    setSelected((prev) => new Map(prev).set(id, name));
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
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {(Object.keys(SOURCE_LABELS) as SeriesSource[]).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => setActiveSource(source)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                activeSource === source ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/50 hover:text-white'
              }`}
            >
              {SOURCE_LABELS[source]}
            </button>
          ))}
        </div>

        <div className="relative">
          <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search series..."
            className="w-full rounded-md border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-sm text-white placeholder-white/30 outline-none focus:border-cyan-400/50"
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
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
            <CategoryTree source={activeSource} selectedIds={selectedIds} onToggleSeries={toggleSeries} />
          )}
        </div>

        <p className="text-xs text-white/30">
          Mix AEO and IEO series freely, up to {MAX_OVERLAY} at once.
        </p>
      </aside>

      <main className="glass-panel min-h-[28rem] flex-1 p-6">
        <AnimatePresence mode="popLayout">
          {selected.size > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-4 flex flex-wrap gap-2"
            >
              {Array.from(selected.entries()).map(([id, name]) => (
                <motion.span
                  key={id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                >
                  <span className="max-w-[16rem] truncate">{name}</span>
                  <button type="button" onClick={() => toggleSeries(id, name)} aria-label={`Remove ${name}`}>
                    <X size={12} />
                  </button>
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div layout transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
          {loadingChart ? (
            <div className="flex h-96 items-center justify-center text-sm text-white/40">Loading chart...</div>
          ) : (
            <SeriesChart series={seriesData} />
          )}
        </motion.div>
      </main>
    </div>
  );
}
