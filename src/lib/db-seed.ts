/**
 * Seed: usuário admin padrão.
 * Execute após db:migrate: npm run db:seed
 */
import { config } from "dotenv";
import { resolve } from "path";
import { MongoClient } from "mongodb";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

config({ path: resolve(process.cwd(), ".env.local") });

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("MONGODB_URI não definida.");
  process.exit(1);
}
const uri = mongoUri;

async function seed() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const users = db.collection("users");

  const login = "abi";
  const password = "apenas1senha";
  const passwordHash = await bcrypt.hash(password, 10);
  const id = "abi-admin-" + randomBytes(8).toString("hex");

  const existing = await users.findOne({ login });
  if (!existing) {
    await users.insertOne({
      id,
      login,
      password_hash: passwordHash,
      role: "admin",
      player_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log("Seed: usuário admin (abi) criado.");
  } else {
    console.log("Seed: usuário admin (abi) já existe.");
  }

  await client.close();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
