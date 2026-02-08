/**
 * Script para rodar a migration do schema no Neon.
 * Execute: npm run db:migrate (carrega .env.local automaticamente)
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL ou DATABASE_URL_UNPOOLED não definida. Configure .env.local");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function migrate() {
  const schemaPath = join(process.cwd(), "src", "lib", "db-schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  const cleanSchema = schema
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
  // Split por ";\n" para obter statements completos
  const statements = cleanSchema
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ";";
    try {
      await sql.query(stmt, []);
      console.log(`OK (${i + 1}/${statements.length}):`, stmt.slice(0, 50) + "...");
    } catch (e) {
      console.error(`Erro no statement ${i + 1}:`, stmt.slice(0, 80), e);
      throw e;
    }
  }
  console.log("Migration concluída.");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
