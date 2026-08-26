import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/mongodb';
import { sendLeadAlertEmail } from '@/lib/email';

function isWorkEmail(email: string): boolean {
  const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  // Soft check only — flag for sales prioritization, don't hard-reject.
  // Rejecting outright loses real leads (plenty of plant managers use gmail).
  return domain ? !freeProviders.includes(domain) : false;
}

export async function POST(req: NextRequest) {
  const leadTokenSecret = process.env.LEAD_TOKEN_SECRET;
  if (!leadTokenSecret) {
    return NextResponse.json(
      {
        error:
          'LEAD_TOKEN_SECRET is not set on the server. Copy .env.example to .env, set a long random ' +
          'LEAD_TOKEN_SECRET (separate from EIA_API_KEY), then restart the server.',
      },
      { status: 500 }
    );
  }

  let body: { email?: string; companyName?: string; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { email, companyName, context } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  if (!companyName?.trim()) {
    return NextResponse.json({ error: 'Company name required' }, { status: 400 });
  }

  try {
    const db = await getDb();

    const tokenPayload = Buffer.from(email.toLowerCase()).toString('base64');
    const signature = crypto.createHmac('sha256', leadTokenSecret).update(tokenPayload).digest('hex');
    const token = `${tokenPayload}.${signature}`;

    const isWork = isWorkEmail(email);

    await db.collection('leads').updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          email: email.toLowerCase(),
          company_name: companyName,
          token_payload: tokenPayload,
          is_work_email_guess: isWork,
          last_seen: new Date(),
          // context = which series/action triggered the gate — tells sales
          // exactly what this lead cares about before the first call
          last_context: context ?? null,
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true }
    );

    // Best-effort: the lead is already saved regardless of whether this
    // succeeds. Awaited (not fire-and-forget) because serverless functions
    // can be frozen/terminated the instant the response is sent.
    try {
      await sendLeadAlertEmail({
        email: email.toLowerCase(),
        companyName,
        isWorkEmailGuess: isWork,
        context: context ?? null,
      });
    } catch (err) {
      console.error('Lead alert email failed (lead was still saved):', err);
    }

    return NextResponse.json({ success: true, token });
  } catch (err) {
    console.error('POST /api/leads failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save lead.' },
      { status: 500 }
    );
  }
}
