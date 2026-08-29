import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import type { InviteDocument, UserDocument } from '@/lib/types';

const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  let body: { token?: string; name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { token, name, password } = body;
  if (!token) {
    return NextResponse.json({ error: 'Missing invite token.' }, { status: 400 });
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Your name is required.' }, { status: 400 });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }

  try {
    const db = await getDb();
    const invites = db.collection<InviteDocument>('invites');
    const users = db.collection<UserDocument>('users');

    const invite = await invites.findOne({ token });
    if (!invite) {
      return NextResponse.json({ error: 'This invite link is invalid.' }, { status: 404 });
    }
    if (invite.accepted) {
      return NextResponse.json({ error: 'This invite has already been used.' }, { status: 409 });
    }
    if (invite.expires_at.getTime() < Date.now()) {
      return NextResponse.json({ error: 'This invite has expired. Ask an admin to send a new one.' }, { status: 410 });
    }

    const existing = await users.findOne({ email: invite.email });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Log in instead.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await users.insertOne({
      email: invite.email,
      password_hash: passwordHash,
      name: name.trim(),
      company_id: invite.company_id,
      role: invite.role,
      created_at: new Date(),
    } as UserDocument);

    await invites.updateOne({ _id: invite._id }, { $set: { accepted: true } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/team/accept-invite failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to accept invite.' },
      { status: 500 }
    );
  }
}
