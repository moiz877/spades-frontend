import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, toObjectId } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import type { TeaScenarioDocument } from '@/lib/types';
import type { ProcessInputs, TEAResult, SensitivityRow, NarrativeSections } from '@/lib/teaTypes';

const MAX_SCENARIOS = 200;

/** Scenarios are shared within a company (all team members can see them), not private per-user. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const scenarios = await db
      .collection<TeaScenarioDocument>('tea_scenarios')
      .find({ company_id: toObjectId(session.user.companyId) }, { projection: { inputs: 0, sensitivity: 0 } })
      .sort({ created_at: -1 })
      .limit(MAX_SCENARIOS)
      .toArray();

    return NextResponse.json({ scenarios });
  } catch (err) {
    console.error('GET /api/scenarios failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch scenarios.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  let body: {
    name?: string;
    inputs?: ProcessInputs;
    result?: TEAResult;
    sensitivity?: SensitivityRow[];
    narrative?: NarrativeSections;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { name, inputs, result, sensitivity, narrative } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Scenario name is required.' }, { status: 400 });
  }
  if (!inputs || !result) {
    return NextResponse.json({ error: 'inputs and result are required.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const insertResult = await db.collection<TeaScenarioDocument>('tea_scenarios').insertOne({
      company_id: toObjectId(session.user.companyId),
      created_by: toObjectId(session.user.id),
      created_by_name: session.user.name,
      name: name.trim(),
      inputs,
      result,
      sensitivity: sensitivity ?? [],
      narrative,
      created_at: new Date(),
    } as TeaScenarioDocument);

    return NextResponse.json({ success: true, id: insertResult.insertedId.toString() });
  } catch (err) {
    console.error('POST /api/scenarios failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save scenario.' },
      { status: 500 }
    );
  }
}
