import { NextRequest, NextResponse } from 'next/server';
import { getCollection, inferSourceFromId } from '@/lib/series';
import type { SeriesDocument, SeriesSource } from '@/lib/types';

const MAX_IDS = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');

  if (!idsParam) {
    return NextResponse.json({ error: 'ids query param is required, e.g. ?ids=id1,id2' }, { status: 400 });
  }

  const ids = idsParam
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ error: 'No valid series ids provided.' }, { status: 400 });
  }

  // Group requested ids by which collection they live in, so a comparison
  // can freely mix AEO and IEO series in one overlay chart.
  const idsBySource = new Map<SeriesSource, string[]>();
  for (const id of ids) {
    const source = inferSourceFromId(id);
    if (!source) continue;
    idsBySource.set(source, [...(idsBySource.get(source) ?? []), id]);
  }

  try {
    const results = await Promise.all(
      Array.from(idsBySource.entries()).map(async ([source, sourceIds]) => {
        const collection = await getCollection(source);
        return collection
          .find({ series_id: { $in: sourceIds } }, { projection: { _id: 0 } })
          .toArray() as Promise<SeriesDocument[]>;
      })
    );

    const found = results.flat();
    const foundIds = new Set(found.map((d) => d.series_id));
    const missing = ids.filter((id) => !foundIds.has(id));

    return NextResponse.json({ series: found, missing });
  } catch (err) {
    console.error('GET /api/series/compare failed:', err);
    return NextResponse.json({ error: 'Failed to fetch series for comparison.' }, { status: 500 });
  }
}
