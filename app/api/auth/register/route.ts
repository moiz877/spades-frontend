import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import type { CompanyDocument, UserDocument } from '@/lib/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

/**
 * Registers a new company and its first user as 'admin'. This is the
 * only way to create a company; every subsequent user joins an existing
 * one via an invite (see /api/team/invite + /api/team/accept-invite).
 */
export async function POST(req: NextRequest) {
  let body: { companyName?: string; name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { companyName, name, email, password } = body;

  if (!companyName?.trim()) {
    return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Your name is required.' }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }

  try {
    const db = await getDb();
    const users = db.collection<UserDocument>('users');
    const companies = db.collection<CompanyDocument>('companies');

    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const companyResult = await companies.insertOne({
      name: companyName.trim(),
      created_at: new Date(),
    } as CompanyDocument);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await users.insertOne({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name: name.trim(),
      company_id: companyResult.insertedId,
      role: 'admin',
      created_at: new Date(),
    } as UserDocument);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/auth/register failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Registration failed.' },
      { status: 500 }
    );
  }
}
