import { NextRequest, NextResponse } from 'next/server';
import { getCollection, inferSourceFromId, isSeriesSource } from '@/lib/series';

export async function GET(
  req: NextRequest,
  { params }: { params: { series_id: string } }
) {
  const seriesId = decodeURIComponent(params.series_id);
  const { searchParams } = new URL(req.url);

  const explicitSource = searchParams.get('source');
  const source = isSeriesSource(explicitSource) ? explicitSource : inferSourceFromId(seriesId);

  if (!source) {
    return NextResponse.json(
      { error: 'Could not determine source (aeo/ieo) for this series_id.' },
      { status: 400 }
    );
  }

  try {
    const collection = await getCollection(source);
    const doc = await collection.findOne({ series_id: seriesId }, { projection: { _id: 0 } });

    if (!doc) {
      return NextResponse.json({ error: `Series not found: ${seriesId}` }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (err) {
    console.error(`GET /api/series/${seriesId} failed:`, err);
    return NextResponse.json({ error: 'Failed to fetch series.' }, { status: 500 });
  }
}
