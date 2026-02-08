/**
 * Autenticação: validação de login, hash de senha, sessão com JWT.
 * JWT válido por 24h; ao expirar, getSession retorna null e o usuário deve logar novamente.
 * Apenas server-side.
 */
import { SignJWT, jwtVerify } from "jose";
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
const JWT_EXPIRY_HOURS = 24;
const JWT_ALG = "HS256";

function getJwtSecret(): Uint8Array {
  const secret = process.env.ABI_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "Defina ABI_JWT_SECRET ou JWT_SECRET (mín. 32 caracteres) para usar autenticação JWT."
    );
  }
  return new TextEncoder().encode(secret);
}

function getExpiryDate(): Date {
  const d = new Date();
  d.setHours(d.getHours() + JWT_EXPIRY_HOURS);
  return d;
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
  const secret = getJwtSecret();
  const exp = getExpiryDate();
  // Payload: id do usuário, id do jogador (playerId), permissão (role)
  const token = await new SignJWT({
    id: user.id,
    login: user.login,
    playerId: user.playerId, // id do jogador (players.id)
    role: user.role,         // permissão: admin | gm | jogador
  })
    .setProtectedHeader({ alg: JWT_ALG })
    .setExpirationTime(exp)
    .setIssuedAt()
    .sign(secret);

  const cookieStore = await cookies();
  const maxAgeSeconds = JWT_EXPIRY_HOURS * 60 * 60;
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    const u = payload as unknown as AuthUser;
    if (u?.id && u?.login && u?.role) {
      return {
        id: u.id,
        login: u.login,
        role: u.role as UserRole,
        playerId: u.playerId ?? null,
      };
    }
  } catch {
    // JWT expirado ou inválido: não modificar cookie aqui (só permitido em Server Action/Route Handler).
    // Retorna null; no próximo login setSession sobrescreve o cookie.
  }
  return null;
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

/** Retorna o role do usuário vinculado ao player, ou null se não houver. */
export async function getPlayerUserRole(
  playerId: string
): Promise<UserRole | null> {
  const rows = await sql`
    SELECT role FROM users WHERE player_id = ${playerId} LIMIT 1
  `;
  const row = (rows as any[])[0];
  return row?.role ?? null;
}

/** Atualiza apenas o role do usuário vinculado ao player. */
export async function updatePlayerUserRole(
  playerId: string,
  role: UserRole
): Promise<void> {
  await sql`
    UPDATE users SET role = ${role}, updated_at = now()
    WHERE player_id = ${playerId}
  `;
}

/** Cria ou atualiza usuário vinculado ao player. Login = nome do jogador. Role = cargo (default jogador). */
export async function createOrUpdateUserForPlayer(
  playerId: string,
  login: string,
  password: string,
  role: UserRole = "jogador"
): Promise<void> {
  const trimmedLogin = login.trim();
  if (!trimmedLogin || !password) return;
  const hash = await hashPassword(password);
  const existing = await sql`
    SELECT id FROM users WHERE player_id = ${playerId} LIMIT 1
  `;
  const row = (existing as any[])[0];
  if (row) {
    await sql`
      UPDATE users SET login = ${trimmedLogin}, password_hash = ${hash}, role = ${role}, updated_at = now()
      WHERE player_id = ${playerId}
    `;
  } else {
    const id = generateId();
    await sql`
      INSERT INTO users (id, login, password_hash, role, player_id, updated_at)
      VALUES (${id}, ${trimmedLogin}, ${hash}, ${role}, ${playerId}, now())
    `;
  }
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
