import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL não está definida. Configure a variável de ambiente no arquivo .env.local"
  );
}

/**
 * Cliente SQL do Neon para uso em Server Components, Route Handlers e Server Actions.
 * Use o template literal para queries seguras contra SQL injection:
 *
 * @example
 * const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
 */
export const sql = neon(databaseUrl);
