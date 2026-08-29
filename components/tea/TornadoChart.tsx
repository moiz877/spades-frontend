'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SensitivityRow } from '@/lib/teaTypes';

/**
 * Standard tornado-chart trick: a transparent "offset" bar positions
 * where the visible "range" bar starts, both stacked in the same slot.
 * X axis is NPV delta from the base case, so bars extend left/right of
 * zero depending on whether the parameter helps or hurts NPV.
 */
export function TornadoChart({ sensitivity }: { sensitivity: SensitivityRow[] }) {
  if (sensitivity.length === 0) return null;

  const rows = sensitivity.map((r) => {
    const lo = Math.min(r.low_npv, r.high_npv) - r.base_npv;
    const hi = Math.max(r.low_npv, r.high_npv) - r.base_npv;
    return { parameter: r.parameter, offset: lo, range: hi - lo, low: r.low_npv, high: r.high_npv };
  });

  return (
    <div className="h-full min-h-[16rem]">
      <ResponsiveContainer width="100%" height="100%" minHeight={Math.max(200, rows.length * 44)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis
            type="number"
            stroke="rgba(255,255,255,0.35)"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
            tickFormatter={(v) => `${v >= 0 ? '+' : ''}${(v / 1_000_000).toFixed(1)}M`}
          />
          <YAxis
            type="category"
            dataKey="parameter"
            stroke="rgba(255,255,255,0.5)"
            tickLine={false}
            axisLine={false}
            width={130}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
            formatter={(_value, _name, item) => {
              const row = item.payload as (typeof rows)[number];
              return [
                `$${row.low.toLocaleString(undefined, { maximumFractionDigits: 0 })} to $${row.high.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                'NPV range',
              ];
            }}
          />
          <Bar dataKey="offset" stackId="tornado" fill="transparent" />
          <Bar dataKey="range" stackId="tornado" fill="#22d3ee" fillOpacity={0.7} radius={2} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
