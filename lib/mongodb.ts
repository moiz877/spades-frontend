import { MongoClient, type Db } from 'mongodb';

// Reuse the client across hot-reloads in dev and across warm serverless
// invocations in prod, instead of opening a new connection per request.
// Connection is lazy — nothing touches the network until a route handler
// actually calls getDb(), so `next build` never tries to dial Mongo.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error(
      'MONGO_URI is not set. Copy .env.example to .env and set MONGO_URI to your MongoDB connection string.'
    );
  }
  return new MongoClient(mongoUri).connect();
}

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClientPromise();
    }
    return global._mongoClientPromise;
  }
  return createClientPromise();
}

export async function getDb(): Promise<Db> {
  const dbName = process.env.MONGO_DB_NAME ?? 'energy_explorer';
  const client = await getClientPromise();
  return client.db(dbName);
}
