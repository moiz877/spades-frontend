import { NextRequest, NextResponse } from 'next/server';
import type { Collection } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { LIVE_ENDPOINTS } from '@/lib/liveEndpoints';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_COLLECTION = 'live_cache';

interface CacheDoc {
  endpoint: string;
  fetched_at: Date;
  payload: unknown;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { endpoint: string } }
) {
  const { endpoint } = params;
  const config = LIVE_ENDPOINTS[endpoint];

  if (!config) {
    return NextResponse.json(
      { error: `Unknown live endpoint: ${endpoint}`, available: Object.keys(LIVE_ENDPOINTS) },
      { status: 404 }
    );
  }

  let cached: CacheDoc | null;
  let cache: Collection<CacheDoc>;
  try {
    const db = await getDb();
    cache = db.collection<CacheDoc>(CACHE_COLLECTION);
    cached = await cache.findOne({ endpoint });
  } catch (err) {
    console.error(`GET /api/live/${endpoint} failed to reach the database:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to connect to the database.' },
      { status: 500 }
    );
  }

  const isFresh = cached && Date.now() - cached.fetched_at.getTime() < CACHE_TTL_MS;

  if (isFresh) {
    return NextResponse.json({
      data: cached!.payload,
      lastUpdated: cached!.fetched_at.toISOString(),
      fromCache: true,
    });
  }

  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'EIA_API_KEY is not set on the server. Copy .env.example to .env and set EIA_API_KEY ' +
          '(register a free key at https://www.eia.gov/opendata/register.php), then restart the server.',
      },
      { status: 500 }
    );
  }

  const url = new URL(`https://api.eia.gov/v2/${config.path}`);
  for (const [key, value] of Object.entries(config.params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('api_key', apiKey); // server-side only — never reaches the client

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      console.error(`EIA API error for ${endpoint}: ${res.status} ${body}`);

      // Fall back to stale cache rather than failing the page entirely, if we have one.
      if (cached) {
        return NextResponse.json({
          data: cached.payload,
          lastUpdated: cached.fetched_at.toISOString(),
          fromCache: true,
          stale: true,
        });
      }
      return NextResponse.json({ error: `EIA API request failed (${res.status}).` }, { status: 502 });
    }

    const payload = await res.json();
    const fetchedAt = new Date();

    await cache.updateOne(
      { endpoint },
      { $set: { endpoint, fetched_at: fetchedAt, payload } },
      { upsert: true }
    );

    return NextResponse.json({ data: payload, lastUpdated: fetchedAt.toISOString(), fromCache: false });
  } catch (err) {
    console.error(`GET /api/live/${endpoint} failed:`, err);
    if (cached) {
      return NextResponse.json({
        data: cached.payload,
        lastUpdated: cached.fetched_at.toISOString(),
        fromCache: true,
        stale: true,
      });
    }
    return NextResponse.json({ error: 'Failed to fetch live data.' }, { status: 500 });
  }
}
