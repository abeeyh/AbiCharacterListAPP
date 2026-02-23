/**
 * Script para migrar dados do Neon (PostgreSQL) para MongoDB.
 * Execute: MONGODB_URI=... DATABASE_URL=... npx tsx src/lib/db-migrate-from-neon.ts
 * Requer ambas as variáveis de ambiente configuradas.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { neon } from "@neondatabase/serverless";
import { MongoClient } from "mongodb";

const databaseUrl = process.env.DATABASE_URL;
const mongoUri = process.env.MONGODB_URI;

if (!databaseUrl || !mongoUri) {
  console.error(
    "Configure DATABASE_URL (Neon) e MONGODB_URI no .env.local para rodar a migração."
  );
  process.exit(1);
}

const sql = neon(databaseUrl);

async function migrate() {
  if (!mongoUri) throw new Error("MONGODB_URI required");
  console.log("Conectando ao MongoDB...");
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  const playersCol = db.collection("players");
  const charactersCol = db.collection("characters");
  const compositionsCol = db.collection("compositions");
  const compositionSlotsCol = db.collection("composition_slots");
  const usersCol = db.collection("users");

  // --- Players ---
  console.log("Migrando players...");
  const playerRows = (await sql`SELECT * FROM players`) as Record<string, unknown>[];
  for (const p of playerRows) {
    await playersCol.updateOne(
      { id: p.id },
      {
        $set: {
          id: p.id,
          player_name: p.player_name,
          realm: p.realm,
          version: p.version,
          addon: p.addon,
          exported_at: p.exported_at ? Number(p.exported_at) : null,
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`  ${playerRows.length} players migrados.`);

  // --- Characters ---
  console.log("Migrando characters...");
  const charRows = (await sql`SELECT * FROM characters`) as Record<string, unknown>[];
  for (const c of charRows) {
    const doc = {
      id: c.id,
      player_id: c.player_id,
      name: c.name,
      realm: c.realm,
      class: c.class,
      item_level: Number(c.item_level ?? 0),
      saved_mythic: c.saved_mythic ?? false,
      saved_heroic: c.saved_heroic ?? false,
      vault: c.vault,
      raids: c.raids,
      extra: c.extra,
      updated_at: new Date(),
      created_at: new Date(),
    };
    await charactersCol.updateOne(
      { id: c.id },
      { $set: doc },
      { upsert: true }
    );
  }
  console.log(`  ${charRows.length} characters migrados.`);

  // --- Compositions ---
  console.log("Migrando compositions...");
  const compRows = (await sql`SELECT * FROM compositions`) as Record<string, unknown>[];
  for (const c of compRows) {
    await compositionsCol.updateOne(
      { id: c.id },
      {
        $set: {
          id: c.id,
          name: c.name,
          type: c.type,
          last_reset_at: c.last_reset_at ? Number(c.last_reset_at) : null,
          scheduled_at: c.scheduled_at ? new Date(c.scheduled_at as string) : null,
          updated_at: new Date(),
          created_at: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`  ${compRows.length} compositions migrados.`);

  // --- Composition Slots ---
  console.log("Migrando composition_slots...");
  const slotRows = (await sql`SELECT * FROM composition_slots`) as Record<string, unknown>[];
  for (const s of slotRows) {
    const doc = {
      id: s.id,
      composition_id: s.composition_id,
      slot_index: Number(s.slot_index),
      character_id: s.character_id,
      player_id: s.player_id,
      player_name: s.player_name,
      saved: s.saved ?? false,
      char_data: s.char_data,
      updated_at: new Date(),
      created_at: new Date(),
    };
    await compositionSlotsCol.updateOne(
      { composition_id: s.composition_id, slot_index: s.slot_index },
      { $set: doc },
      { upsert: true }
    );
  }
  console.log(`  ${slotRows.length} composition_slots migrados.`);

  // --- Users ---
  console.log("Migrando users...");
  const userRows = (await sql`SELECT * FROM users`) as Record<string, unknown>[];
  for (const u of userRows) {
    await usersCol.updateOne(
      { id: u.id },
      {
        $set: {
          id: u.id,
          login: u.login,
          password_hash: u.password_hash,
          role: u.role,
          player_id: u.player_id,
          updated_at: new Date(),
          created_at: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`  ${userRows.length} users migrados.`);

  await client.close();
  console.log("\nMigração concluída com sucesso.");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
