import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions, toObjectId } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import type { TeaScenarioDocument } from '@/lib/types';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  if (!ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: 'Invalid scenario id.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const scenario = await db.collection<TeaScenarioDocument>('tea_scenarios').findOne({
      _id: new ObjectId(params.id),
      company_id: toObjectId(session.user.companyId), // scoped to caller's own company
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found.' }, { status: 404 });
    }
    return NextResponse.json({ scenario });
  } catch (err) {
    console.error(`GET /api/scenarios/${params.id} failed:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch scenario.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  if (!ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: 'Invalid scenario id.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const result = await db.collection<TeaScenarioDocument>('tea_scenarios').deleteOne({
      _id: new ObjectId(params.id),
      company_id: toObjectId(session.user.companyId), // scoped -- can't delete another company's scenario
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Scenario not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/scenarios/${params.id} failed:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete scenario.' },
      { status: 500 }
    );
  }
}
