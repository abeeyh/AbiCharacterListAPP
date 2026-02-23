/**
 * Script para criar índices no MongoDB.
 * Execute: npm run db:migrate (carrega .env.local automaticamente)
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("MONGODB_URI não definida. Configure .env.local");
  process.exit(1);
}
const uri = mongoUri;

async function migrate() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  // Índices para players
  await db.collection("players").createIndex({ id: 1 }, { unique: true });
  await db.collection("players").createIndex({ player_name: 1 });

  // Índices para characters
  await db.collection("characters").createIndex({ id: 1 }, { unique: true });
  await db.collection("characters").createIndex({ player_id: 1 });

  // Índices para compositions
  await db.collection("compositions").createIndex({ id: 1 }, { unique: true });
  await db.collection("compositions").createIndex({ name: 1 });

  // Índices para composition_slots
  await db.collection("composition_slots").createIndex({ composition_id: 1 });
  await db.collection("composition_slots").createIndex(
    { composition_id: 1, slot_index: 1 },
    { unique: true }
  );

  // Índices para users
  await db.collection("users").createIndex({ id: 1 }, { unique: true });
  await db.collection("users").createIndex({ login: 1 }, { unique: true });
  await db.collection("users").createIndex({ player_id: 1 });

  await client.close();
  console.log("Migração (índices) concluída.");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
