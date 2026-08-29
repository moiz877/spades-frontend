'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { WarningCircle } from '@phosphor-icons/react';
import { TornadoChart } from './TornadoChart';
import type { RunTeaResponse } from '@/lib/teaTypes';

function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function StatCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-white';
  return (
    <div className="glass-panel p-4">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function TeaResultsPanel({ data }: { data: RunTeaResponse }) {
  const { result, sensitivity } = data;
  const cashFlowRows = result.cash_flows.map((cf, year) => ({ year, cf }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total CapEx" value={formatMoney(result.total_capex)} />
        <StatCard label="NPV" value={formatMoney(result.npv)} tone={result.npv >= 0 ? 'good' : 'bad'} />
        <StatCard label="IRR" value={result.irr !== null ? `${(result.irr * 100).toFixed(1)}%` : 'N/A'} />
        <StatCard
          label="Payback"
          value={result.payback_period_years !== null ? `${result.payback_period_years.toFixed(1)} yr` : 'Never'}
        />
      </div>

      {result.notes.length > 0 && (
        <div className="glass-panel flex flex-col gap-1.5 p-4">
          {result.notes.map((note, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-amber-400">
              <WarningCircle size={14} className="mt-0.5 shrink-0" />
              {note}
            </p>
          ))}
        </div>
      )}

      <div className="glass-panel p-6">
        <h3 className="text-sm font-semibold text-white">Cash flow by year</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowRows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="year"
                stroke="rgba(255,255,255,0.35)"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
                width={64}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
              />
              <Tooltip
                contentStyle={{ background: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                formatter={(value: number) => [formatMoney(value), 'Cash flow']}
                labelFormatter={(year) => `Year ${year}`}
              />
              <Bar dataKey="cf" radius={2}>
                {cashFlowRows.map((row, i) => (
                  <Cell key={i} fill={row.cf >= 0 ? '#34d399' : '#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {sensitivity && sensitivity.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold text-white">Sensitivity (NPV impact, +/-20%)</h3>
          <p className="mt-1 text-xs text-white/40">
            One input varied at a time, holding everything else at its base case.
          </p>
          <div className="mt-4">
            <TornadoChart sensitivity={sensitivity} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/50">
        <span>Working capital: {formatMoney(result.working_capital)}</span>
        <span>Annual revenue: {formatMoney(result.annual_revenue)}</span>
        <span>Annual OpEx: {formatMoney(result.opex_breakdown.total)}</span>
      </div>
    </div>
  );
}
