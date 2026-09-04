import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/series';
import type { SeriesSource } from '@/lib/types';

const METADATA_PROJECTION = { _id: 0, series_id: 1, name: 1, units: 1 } as const;

interface BenchmarkRequestItem {
  /** e.g. a feedstock/utility name from the TEA form, "Natural gas". */
  name: string;
  /** the $/unit assumption used in the TEA run. */
  assumed_price: number;
  /** which AEO/IEO collection to search -- defaults to 'aeo' (US pricing). */
  source?: SeriesSource;
}

interface BenchmarkResult {
  name: string;
  assumed_price: number;
  matched_series: { series_id: string; name: string; units: string } | null;
  projected_range: { min: number; max: number; median: number } | null;
  percentile: number | null;
  note: string;
}

/**
 * Grounds a TEA input's assumed $/unit price against the closest-matching
 * EIA series by name (text search, same index /api/series/search uses),
 * showing where the assumption sits within that series' full projected
 * value range. This is deliberately NOT a curated name->series_id lookup
 * table: guessing a fixed series ID without verifying it against live
 * data already burned us once (see commodity_prices.py's TODO-flagged
 * placeholders) -- a live keyword match plus a visible "matched against"
 * label lets the user immediately see if the match is wrong, rather than
 * silently trusting a hardcoded guess.
 */
async function benchmarkOne(item: BenchmarkRequestItem): Promise<BenchmarkResult> {
  const source: SeriesSource = item.source ?? 'aeo';
  const collection = await getCollection(source);

  const meta = await collection
    .find({ $text: { $search: item.name } }, { projection: METADATA_PROJECTION })
    .sort({ score: { $meta: 'textScore' } })
    .limit(1)
    .toArray();

  if (meta.length === 0) {
    return {
      name: item.name,
      assumed_price: item.assumed_price,
      matched_series: null,
      projected_range: null,
      percentile: null,
      note: `No ${source.toUpperCase()} series matched "${item.name}" by name -- cannot benchmark this input.`,
    };
  }

  const matched = meta[0] as { series_id: string; name: string; units: string };
  const full = await collection.findOne(
    { series_id: matched.series_id },
    { projection: { _id: 0, data: 1 } }
  );
  const values = (full?.data ?? [])
    .map((p: { value: number | null }) => p.value)
    .filter((v: number | null): v is number => v !== null);

  if (values.length === 0) {
    return {
      name: item.name,
      assumed_price: item.assumed_price,
      matched_series: matched,
      projected_range: null,
      percentile: null,
      note: `Matched "${matched.name}" but it has no numeric data to benchmark against.`,
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const below = values.filter((v) => v <= item.assumed_price).length;
  const percentile = Math.round((below / values.length) * 100);

  return {
    name: item.name,
    assumed_price: item.assumed_price,
    matched_series: matched,
    projected_range: { min, max, median },
    percentile,
    note: `Matched by keyword search against "${matched.name}" (${matched.units}) -- verify this is the right reference series before relying on it.`,
  };
}

export async function POST(req: NextRequest) {
  let items: BenchmarkRequestItem[];
  try {
    const body = await req.json();
    items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const results = await Promise.all(items.slice(0, 20).map(benchmarkOne));
    return NextResponse.json({ results });
  } catch (err) {
    console.error('POST /api/tea/benchmark failed:', err);
    return NextResponse.json({ error: 'Failed to benchmark inputs.' }, { status: 500 });
  }
}
