'use client';

import { useMemo, useState } from 'react';
import { calculateROIDelta, tenYearDelta, type DataPoint } from '@/lib/roiCalculations';
import { useLeadGateStore } from '@/lib/leadGateStore';
import { BookCallButton } from './BookCallButton';

export function ROICalculatorOverlay({
  seriesId,
  seriesName,
  units,
  dataPoints,
  currentYear,
}: {
  seriesId: string;
  seriesName: string;
  units: string;
  dataPoints: DataPoint[];
  currentYear: number;
}) {
  const [consumption, setConsumption] = useState<number>(50000); // MWh, sensible default
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const { isUnlocked, token, openModal } = useLeadGateStore();

  const roiRows = useMemo(() => {
    try {
      return calculateROIDelta(dataPoints, consumption, currentYear);
    } catch {
      return [];
    }
  }, [dataPoints, consumption, currentYear]);

  const delta = tenYearDelta(roiRows);
  const isIncrease = delta > 0;
  const hasData = roiRows.length > 0;

  async function handleExport() {
    if (!isUnlocked) {
      openModal(`export:${seriesId}`); // context tag tells sales what they wanted
      return;
    }

    const pdfServiceUrl = process.env.NEXT_PUBLIC_PDF_SERVICE_URL;
    if (!pdfServiceUrl) {
      setExportError('PDF export service is not configured (NEXT_PUBLIC_PDF_SERVICE_URL missing).');
      return;
    }

    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`${pdfServiceUrl}/generate-tea-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Lead-Token': token! },
        body: JSON.stringify({
          series_id: seriesId,
          series_name: seriesName,
          units,
          data_points: dataPoints,
          consumption_mwh: consumption,
          current_year: currentYear,
        }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          openModal(`export:${seriesId}`); // token invalid/expired server-side -> re-gate
          return;
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Export failed (${res.status}).`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TEA_Report_${seriesId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setExported(true); // the hottest moment to offer a call — they just got real value
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="glass-panel absolute right-6 top-6 w-72 p-4">
      <label htmlFor="roi-consumption" className="text-xs uppercase tracking-wide text-white/50">
        Your annual consumption
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id="roi-consumption"
          type="number"
          min={0}
          value={consumption}
          onChange={(e) => setConsumption(Number(e.target.value))}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400/50"
        />
        <span className="text-sm text-white/50">MWh</span>
      </div>

      <div className="mt-4">
        <p className="text-xs text-white/50">10-year projected delta</p>
        {hasData ? (
          <p className={`text-2xl font-semibold ${isIncrease ? 'text-red-400' : 'text-emerald-400'}`}>
            {isIncrease ? '+' : '-'}${Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        ) : (
          <p className="text-sm text-white/40">No price data for {currentYear}.</p>
        )}
      </div>

      {exportError && <p className="mt-3 text-xs text-red-400">{exportError}</p>}

      <button
        type="button"
        onClick={handleExport}
        disabled={exporting || !hasData}
        className="mt-4 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        {exporting ? 'Generating...' : 'Export CFO-ready TEA report'}
      </button>

      {exported && (
        <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
          <p className="text-xs text-white/50">Want to walk through this with someone?</p>
          <BookCallButton className="justify-center" />
        </div>
      )}
    </div>
  );
}
