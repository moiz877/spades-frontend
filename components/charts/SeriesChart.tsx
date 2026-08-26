'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { mergeSeriesForChart, SERIES_COLORS } from '@/lib/chartData';
import type { SeriesDocument } from '@/lib/types';

export function SeriesChart({ series }: { series: SeriesDocument[] }) {
  if (series.length === 0) {
    return (
      <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-2 text-center text-white/40">
        <p className="text-sm">Select a series from the category tree to chart it.</p>
      </div>
    );
  }

  const rows = mergeSeriesForChart(series);

  return (
    <div className="flex h-full min-h-[24rem] flex-col gap-4">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={360}>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="rgba(255,255,255,0.35)"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.35)"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}
              width={64}
            />
            <Tooltip
              contentStyle={{
                background: '#0b0f15',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
            />
            {series.map((s, i) => (
              <Line
                key={s.series_id}
                type="monotone"
                dataKey={s.series_id}
                name={s.name}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive
                animationDuration={600}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {series.map((s, i) => (
          <li key={s.series_id} className="flex items-center gap-2 text-xs text-white/70">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            <span className="max-w-xs truncate">{s.name}</span>
            <span className="text-white/40">({s.units})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
