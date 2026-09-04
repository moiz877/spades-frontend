'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FloppyDisk } from '@phosphor-icons/react';
import { ExecutiveSummaryReport } from '@/components/tea/ExecutiveSummaryReport';
import { ProcessInputForm } from '@/components/tea/ProcessInputForm';
import { TeaResultsPanel } from '@/components/tea/TeaResultsPanel';
import { Button } from '@/components/ui/Button';
import { Glow } from '@/components/ui/Glow';
import {
  DEFAULT_IRR_HURDLE_PCT,
  DEFAULT_PAYBACK_HURDLE_YEARS,
  DEFAULT_PROCESS_INPUTS,
  type BenchmarkResult,
  type ProcessInputs,
  type RunTeaResponse,
} from '@/lib/teaTypes';

function TeaBuilderContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get('scenario');

  const [inputs, setInputs] = useState<ProcessInputs>(DEFAULT_PROCESS_INPUTS);
  const [response, setResponse] = useState<RunTeaResponse | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [irrHurdlePct, setIrrHurdlePct] = useState(DEFAULT_IRR_HURDLE_PCT);
  const [paybackHurdleYears, setPaybackHurdleYears] = useState(DEFAULT_PAYBACK_HURDLE_YEARS);

  useEffect(() => {
    if (!scenarioId) return;
    fetch(`/api/scenarios/${scenarioId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.scenario) {
          setInputs(data.scenario.inputs);
          setResponse({
            result: data.scenario.result,
            sensitivity: data.scenario.sensitivity,
            narrative: data.scenario.narrative,
          });
          setScenarioName(data.scenario.name);
        }
      })
      .catch(() => {});
  }, [scenarioId]);

  async function handleRun() {
    setRunning(true);
    setRunError(null);
    setSaveMessage(null);
    setBenchmarks([]);
    try {
      const pdfServiceUrl = process.env.NEXT_PUBLIC_PDF_SERVICE_URL;
      if (!pdfServiceUrl) throw new Error('NEXT_PUBLIC_PDF_SERVICE_URL is not configured.');

      const res = await fetch(`${pdfServiceUrl}/run-tea`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs,
          include_sensitivity: true,
          irr_hurdle_pct: irrHurdlePct,
          payback_hurdle_years: paybackHurdleYears,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Failed to run TEA.');
      setResponse(data);

      const priceableItems = [...inputs.feedstocks, ...inputs.utilities]
        .filter((item) => item.price_override != null)
        .map((item) => ({ name: item.name, assumed_price: item.price_override as number }));
      if (priceableItems.length > 0) {
        fetch('/api/tea/benchmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: priceableItems }),
        })
          .then((r) => r.json())
          .then((d) => setBenchmarks(d.results ?? []))
          .catch(() => setBenchmarks([]));
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to run TEA.');
    } finally {
      setRunning(false);
    }
  }

  async function handleSave() {
    if (!response) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scenarioName || inputs.process_name || 'Untitled scenario',
          inputs,
          result: response.result,
          sensitivity: response.sensitivity,
          narrative: response.narrative,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save.');
      setSaveMessage('Saved to your team scenarios.');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:flex-row">
      <Glow className="left-1/4 top-0 h-72 w-72" />

      <div className="glass-panel w-full p-6 lg:w-[26rem] lg:shrink-0">
        <h1 className="text-lg font-semibold text-white">TEA Builder</h1>
        <p className="mt-1 text-sm text-white/50">
          Model a chemical process and get CapEx, OpEx, NPV, IRR, and payback.
        </p>
        {runError && <p className="mt-3 text-sm text-red-400">{runError}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <label className="flex flex-col gap-1 text-xs text-white/50">
            IRR hurdle rate (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={irrHurdlePct * 100}
              onChange={(e) => setIrrHurdlePct((Number(e.target.value) || 0) / 100)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/50"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/50">
            Payback target (years)
            <input
              type="number"
              min={0}
              step={0.5}
              value={paybackHurdleYears}
              onChange={(e) => setPaybackHurdleYears(Number(e.target.value) || 0)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/50"
            />
          </label>
        </div>

        <div className="mt-6">
          <ProcessInputForm value={inputs} onChange={setInputs} onSubmit={handleRun} submitting={running} />
        </div>
      </div>

      <div className="min-h-[28rem] flex-1">
        {response ? (
          <>
            {session && (
              <div className="glass-panel mb-4 flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <input
                  type="text"
                  placeholder="Scenario name"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-cyan-400/50"
                />
                <Button type="button" onClick={handleSave} disabled={saving} className="whitespace-nowrap">
                  <FloppyDisk size={14} />
                  {saving ? 'Saving...' : 'Save scenario'}
                </Button>
              </div>
            )}
            {saveMessage && <p className="mb-4 text-sm text-white/60">{saveMessage}</p>}
            {response.narrative && (
              <div className="mb-6">
                <ExecutiveSummaryReport narrative={response.narrative} benchmarks={benchmarks} />
              </div>
            )}
            <TeaResultsPanel data={response} />
          </>
        ) : (
          <div className="glass-panel flex h-full min-h-[24rem] items-center justify-center p-6 text-center text-sm text-white/40">
            Fill in the process details and run the model to see results here.
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeaBuilderPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-white/40">Loading...</div>}>
      <TeaBuilderContent />
    </Suspense>
  );
}
