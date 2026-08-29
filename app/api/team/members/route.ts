import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, toObjectId } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import type { InviteDocument, UserDocument } from '@/lib/types';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const companyId = toObjectId(session.user.companyId);

    const members = await db
      .collection<UserDocument>('users')
      .find({ company_id: companyId }, { projection: { password_hash: 0 } })
      .sort({ created_at: 1 })
      .toArray();

    const pendingInvites = await db
      .collection<InviteDocument>('invites')
      .find({ company_id: companyId, accepted: false, expires_at: { $gt: new Date() } })
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json({ members, pendingInvites });
  } catch (err) {
    console.error('GET /api/team/members failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch team.' },
      { status: 500 }
    );
  }
}
