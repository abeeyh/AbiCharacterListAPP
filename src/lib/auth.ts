/**
 * Autenticação: validação de login, hash de senha, sessão.
 * Apenas server-side.
 */
import { sql } from "./db";
import * as bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { generateId } from "./types";

export type UserRole = "admin" | "gm" | "jogador";

export interface AuthUser {
  id: string;
  login: string;
  role: UserRole;
  playerId: string | null;
}

const COOKIE_NAME = "abi-auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function encodeSession(user: AuthUser): string {
  return Buffer.from(JSON.stringify(user), "utf-8").toString("base64url");
}

function decodeSession(value: string): AuthUser | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf-8");
    const u = JSON.parse(json) as AuthUser;
    if (u?.id && u?.login && u?.role) return u;
  } catch {
    // ignore
  }
  return null;
}

export async function validateLogin(
  login: string,
  password: string
): Promise<AuthUser | null> {
  const rows = await sql`
    SELECT id, login, password_hash, role, player_id
    FROM users
    WHERE LOWER(TRIM(login)) = LOWER(TRIM(${login}))
    LIMIT 1
  `;
  const row = (rows as any[])[0];
  if (!row) return null;
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return null;
  return {
    id: row.id,
    login: row.login,
    role: row.role as UserRole,
    playerId: row.player_id ?? null,
  };
}

export async function setSession(user: AuthUser): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return null;
  return decodeSession(value);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function createUser(
  login: string,
  password: string,
  role: UserRole,
  playerId?: string | null
): Promise<AuthUser> {
  const id = generateId();
  const hash = await hashPassword(password);
  await sql`
    INSERT INTO users (id, login, password_hash, role, player_id, updated_at)
    VALUES (${id}, ${login.trim()}, ${hash}, ${role}, ${playerId ?? null}, now())
  `;
  return {
    id,
    login: login.trim(),
    role,
    playerId: playerId ?? null,
  };
}

export function hasRole(user: AuthUser | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, "admin");
}

export function isGmOrAbove(user: AuthUser | null): boolean {
  return hasRole(user, "admin", "gm");
}
