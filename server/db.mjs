import { MongoClient } from 'mongodb';

export async function connectDb({ mongoUrl, mongoDb }) {
  const client = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 10_000, appName: 'shueho-zhiborl' });
  await client.connect();
  const db = client.db(mongoDb);
  const collections = {
    months: db.collection('schedule_months'),
    state: db.collection('sync_state'),
    runs: db.collection('sync_runs'),
  };
  await collections.runs.createIndex({ startedAt: -1 });
  return { client, db, ...collections };
}
