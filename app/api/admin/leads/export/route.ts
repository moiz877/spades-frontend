import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isAdminAuthorized } from '@/lib/adminAuth';

const MAX_LEADS = 2000;

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * CSV export for feeding leads straight into outreach tools
 * (Apollo, Instantly, lemlist, or a plain spreadsheet).
 */
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

    const columns = ['email', 'company_name', 'is_work_email_guess', 'last_context', 'created_at', 'last_seen'];
    const header = columns.join(',');
    const rows = leads.map((lead) =>
      columns
        .map((col) => {
          const value = lead[col];
          return csvEscape(value instanceof Date ? value.toISOString() : value);
        })
        .join(',')
    );

    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error('GET /api/admin/leads/export failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to export leads.' },
      { status: 500 }
    );
  }
}
