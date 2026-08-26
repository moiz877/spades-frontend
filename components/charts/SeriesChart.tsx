'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartLineUp } from '@phosphor-icons/react';
import { mergeSeriesForChart, SERIES_COLORS } from '@/lib/chartData';
import type { SeriesDocument } from '@/lib/types';

const TOOLTIP_STYLE = {
  background: '#111111',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
};

/** Baseline reference for shading the projected-vs-current-price delta. */
export interface RoiBaseline {
  /** The series' value in the current/base year. */
  value: number;
  /** True when the trend from baseline is a cost increase (shaded red), false for a decrease (shaded green). */
  isIncrease: boolean;
}

export function SeriesChart({
  series,
  roiBaseline,
}: {
  series: SeriesDocument[];
  roiBaseline?: RoiBaseline;
}) {
  if (series.length === 0) {
    return (
      <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-3 text-center">
        <ChartLineUp size={32} className="text-white/15" />
        <p className="max-w-xs text-sm text-white/40">
          Select a series from the category tree to generate its projection chart.
        </p>
      </div>
    );
  }

  const rows = mergeSeriesForChart(series);
  // Shaded baseline-delta area only makes sense with exactly one series in
  // frame — otherwise "baseline" is ambiguous across multiple series.
  const showRoiArea = roiBaseline && series.length === 1;
  const areaColor = roiBaseline?.isIncrease ? '#f87171' : '#34d399';

  return (
    <div className="flex h-full min-h-[24rem] flex-col gap-4">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={360}>
          <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} />

            {showRoiArea && (
              <>
                <ReferenceLine
                  y={roiBaseline!.value}
                  stroke="rgba(255,255,255,0.3)"
                  strokeDasharray="4 4"
                  label={{ value: 'Baseline', fill: 'rgba(255,255,255,0.4)', fontSize: 11, position: 'insideTopLeft' }}
                />
                <Area
                  type="monotone"
                  dataKey={series[0].series_id}
                  baseValue={roiBaseline!.value}
                  stroke="none"
                  fill={areaColor}
                  fillOpacity={0.12}
                  isAnimationActive
                  animationDuration={600}
                />
              </>
            )}

            {series.map((s, i) => (
              <Line
                key={s.series_id}
                type="monotone"
                dataKey={s.series_id}
                name={s.name}
                stroke={showRoiArea ? areaColor : SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive
                animationDuration={600}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {series.map((s, i) => (
          <li key={s.series_id} className="flex items-center gap-2 text-xs text-white/70">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: showRoiArea ? areaColor : SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            <span className="max-w-xs truncate">{s.name}</span>
            <span className="text-white/40">({s.units})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
