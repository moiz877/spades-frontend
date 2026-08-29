import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { AEO_LABEL } from '@/lib/dataVintage';

interface IngestionMetaDoc {
  source: string;
  filename: string;
  series_count: number;
  ingested_at: Date;
}

/**
 * Reports what scripts/ingest.py last recorded to _ingestion_meta for
 * each source, so an operator can tell at a glance whether the site is
 * still running on last year's AEO without digging through MongoDB
 * directly. Pair with scripts/check_aeo_freshness.py, which checks
 * whether EIA has published something newer than this.
 */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const docs = await db.collection<IngestionMetaDoc>('_ingestion_meta').find({}).toArray();

    return NextResponse.json({
      frontend_aeo_label: AEO_LABEL,
      sources: docs.map((doc) => ({
        source: doc.source,
        filename: doc.filename,
        series_count: doc.series_count,
        ingested_at: doc.ingested_at,
      })),
    });
  } catch (err) {
    console.error('GET /api/admin/data-freshness failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch ingestion metadata.' },
      { status: 500 }
    );
  }
}
