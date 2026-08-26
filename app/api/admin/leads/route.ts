import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isAdminAuthorized } from '@/lib/adminAuth';

const MAX_LEADS = 500;

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const leads = await db
      .collection('leads')
      .find({}, { projection: { token_payload: 0 } })
      .sort({ last_seen: -1 })
      .limit(MAX_LEADS)
      .toArray();

    return NextResponse.json({ leads });
  } catch (err) {
    console.error('GET /api/admin/leads failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch leads.' },
      { status: 500 }
    );
  }
}
