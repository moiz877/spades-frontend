import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions, toObjectId } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { sendTeamInviteEmail } from '@/lib/email';
import type { InviteDocument, TeamRole, UserDocument } from '@/lib/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can invite teammates.' }, { status: 403 });
  }

  let body: { email?: string; role?: TeamRole };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { email, role = 'member' } = body;
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (role !== 'admin' && role !== 'member') {
    return NextResponse.json({ error: "role must be 'admin' or 'member'." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const companyId = toObjectId(session.user.companyId);

    const existingUser = await db
      .collection<UserDocument>('users')
      .findOne({ email: email.toLowerCase(), company_id: companyId });
    if (existingUser) {
      return NextResponse.json({ error: 'This person is already on your team.' }, { status: 409 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();

    await db.collection<InviteDocument>('invites').insertOne({
      email: email.toLowerCase(),
      company_id: companyId,
      role,
      token,
      invited_by: toObjectId(session.user.id),
      created_at: now,
      expires_at: new Date(now.getTime() + INVITE_TTL_MS),
      accepted: false,
    } as InviteDocument);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const acceptUrl = `${siteUrl}/accept-invite?token=${token}`;

    try {
      await sendTeamInviteEmail({
        toEmail: email,
        companyName: session.user.companyName,
        inviterName: session.user.name,
        acceptUrl,
      });
      return NextResponse.json({ success: true, emailed: true });
    } catch (emailErr) {
      // Invite record exists either way -- surface the link so the admin
      // can share it manually if email isn't configured yet.
      console.warn('Invite email failed, returning link for manual sharing:', emailErr);
      return NextResponse.json({ success: true, emailed: false, acceptUrl });
    }
  } catch (err) {
    console.error('POST /api/team/invite failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create invite.' },
      { status: 500 }
    );
  }
}
