import { MongoClient, Db } from "mongodb";

function getMongoUri(): string {
  const u = process.env.MONGODB_URI;
  if (typeof u !== "string" || !u) {
    throw new Error(
      "MONGODB_URI não está definida. Configure a variável de ambiente no arquivo .env.local"
    );
  }
  return u;
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(getMongoUri());
  await client.connect();
  db = client.db();
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
