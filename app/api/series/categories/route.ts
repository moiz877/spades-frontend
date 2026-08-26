import { NextRequest, NextResponse } from 'next/server';
import { getCollection, isSeriesSource } from '@/lib/series';

export interface CategoryNode {
  /** This node's own segment value, e.g. "ALTTRNP". */
  value: string;
  /** How many series live under this node (including itself if it's a leaf). */
  count: number;
  /** True when this node is itself a selectable series, not just a category. */
  isLeaf: boolean;
  /** Present only when isLeaf. */
  seriesId?: string;
  seriesName?: string;
}

/**
 * Returns the immediate children of a category_path prefix, without ever
 * scanning the full ~171k/~44k document collections client-side. Powers the
 * browsable category tree sidebar (drill down one level at a time) instead
 * of forcing users to search flat lists.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source') ?? 'aeo';
  if (!isSeriesSource(source)) {
    return NextResponse.json({ error: "source must be 'aeo' or 'ieo'" }, { status: 400 });
  }

  const prefix = searchParams.get('prefix')?.trim();
  const prefixSegments = prefix ? prefix.split('.').filter(Boolean) : [];
  const depth = prefixSegments.length;

  const matchStage =
    depth > 0
      ? { $expr: { $eq: [{ $slice: ['$category_path', 0, depth] }, prefixSegments] } }
      : {};

  try {
    const collection = await getCollection(source);

    const rows = await collection
      .aggregate<{
        _id: string;
        count: number;
        sampleId: string;
        sampleName: string;
        anyLeaf: number;
      }>([
        { $match: matchStage },
        {
          $project: {
            child: { $arrayElemAt: ['$category_path', depth] },
            isLeaf: { $eq: [{ $size: '$category_path' }, depth + 1] },
            series_id: 1,
            name: 1,
          },
        },
        { $match: { child: { $ne: null } } },
        {
          $group: {
            _id: '$child',
            count: { $sum: 1 },
            sampleId: { $first: '$series_id' },
            sampleName: { $first: '$name' },
            anyLeaf: { $max: { $cond: ['$isLeaf', 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const nodes: CategoryNode[] = rows.map((row) => {
      const isLeaf = row.count === 1 && row.anyLeaf === 1;
      return {
        value: row._id,
        count: row.count,
        isLeaf,
        ...(isLeaf ? { seriesId: row.sampleId, seriesName: row.sampleName } : {}),
      };
    });

    return NextResponse.json({ prefix: prefixSegments.join('.'), nodes });
  } catch (err) {
    console.error('GET /api/series/categories failed:', err);
    return NextResponse.json({ error: 'Failed to fetch categories.' }, { status: 500 });
  }
}
