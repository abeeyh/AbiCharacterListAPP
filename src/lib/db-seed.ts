/**
 * Seed: usuário admin padrão.
 * Execute após db:migrate: npm run db:seed
 */
import { config } from "dotenv";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

config({ path: resolve(process.cwd(), ".env.local") });

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function seed() {
  const login = "abi";
  const password = "apenas1senha";
  const passwordHash = await bcrypt.hash(password, 10);
  const id = "abi-admin-" + randomBytes(8).toString("hex");

  await sql`
    INSERT INTO users (id, login, password_hash, role, updated_at)
    VALUES (${id}, ${login}, ${passwordHash}, 'admin', now())
    ON CONFLICT (login) DO NOTHING
  `;
  console.log("Seed: usuário admin (abi) verificado/criado.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
