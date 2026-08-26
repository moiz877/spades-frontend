import { NextRequest, NextResponse } from 'next/server';
import { getCollection, isSeriesSource } from '@/lib/series';
import type { SeriesMeta } from '@/lib/types';

const MAX_PAGE_SIZE = 50;

// Fields returned for list views — metadata only, never the `data` array.
const METADATA_PROJECTION = {
  _id: 0,
  series_id: 1,
  name: 1,
  units: 1,
  frequency: 1,
  description: 1,
  start: 1,
  end: 1,
  last_historical_period: 1,
  last_updated: 1,
  category_path: 1,
} as const;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const source = searchParams.get('source') ?? 'aeo';
  if (!isSeriesSource(source)) {
    return NextResponse.json({ error: "source must be 'aeo' or 'ieo'" }, { status: 400 });
  }

  const q = searchParams.get('q')?.trim();
  const category = searchParams.get('category')?.trim();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10) || 25)
  );

  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$text = { $search: q };
  }
  if (category) {
    // category is a "." joined prefix of category_path, e.g. "AEO.2026.ALTTRNP"
    filter.category_path = { $all: category.split('.') };
  }

  try {
    const collection = await getCollection(source);

    const cursor = collection
      .find(filter, { projection: METADATA_PROJECTION })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    // Sort by text-search relevance when searching, otherwise by name.
    if (q) {
      cursor.sort({ score: { $meta: 'textScore' } });
    } else {
      cursor.sort({ name: 1 });
    }

    const [results, total] = await Promise.all([
      cursor.toArray() as Promise<SeriesMeta[]>,
      collection.countDocuments(filter),
    ]);

    return NextResponse.json({
      results,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('GET /api/series/search failed:', err);
    return NextResponse.json({ error: 'Failed to search series.' }, { status: 500 });
  }
}
