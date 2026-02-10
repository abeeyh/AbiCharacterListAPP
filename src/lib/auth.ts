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
const IMPERSONATION_BACKUP_COOKIE = "abi-auth-backup";
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

// Senha mestra: hardcoded, usada apenas como 2º fator para acessar páginas admin.
// A senha do admin para login continua no banco (users.password_hash).
const MASTER_PASSWORD = "abi2admin";
const MASTER_COOKIE = "abi-master-ok";
const MASTER_COOKIE_MAX_AGE = 8 * 60 * 60; // 8 horas

/** Verifica se a senha mestra está correta (hardcoded). Apenas admin. */
export function verifyMasterPassword(password: string): boolean {
  return password === MASTER_PASSWORD;
}

/** Verifica se o cookie da senha mestra está presente (admin já verificou). */
export async function hasMasterCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  const val = cookieStore.get(MASTER_COOKIE)?.value;
  return val === "1";
}

/** Define o cookie de verificação da senha mestra. */
export async function setMasterCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(MASTER_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MASTER_COOKIE_MAX_AGE,
    path: "/",
  });
}

export interface UserInfo {
  id: string;
  login: string;
  role: UserRole;
  playerId: string | null;
  playerName?: string;
}

/** Lista todos os usuários (admin apenas). Inclui usuários com e sem player vinculado. */
export async function listAllUsers(): Promise<UserInfo[]> {
  const rows = await sql`
    SELECT u.id, u.login, u.role, u.player_id, p.player_name
    FROM users u
    LEFT JOIN players p ON p.id = u.player_id
    ORDER BY u.login
  `;
  return (rows as any[]).map((r) => ({
    id: r.id,
    login: r.login,
    role: r.role as UserRole,
    playerId: r.player_id ?? null,
    playerName: r.player_name ?? undefined,
  }));
}

/** Verifica se há sessão de admin em backup (impersonação ativa). */
export async function hasImpersonationBackup(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(IMPERSONATION_BACKUP_COOKIE)?.value;
}

/** Retorna AuthUser a partir do ID do usuário (para impersonação). */
export async function getAuthUserById(userId: string): Promise<AuthUser | null> {
  const rows = await sql`
    SELECT id, login, role, player_id FROM users WHERE id = ${userId} LIMIT 1
  `;
  const row = (rows as any[])[0];
  if (!row) return null;
  return {
    id: row.id,
    login: row.login,
    role: row.role as UserRole,
    playerId: row.player_id ?? null,
  };
}

/** Impersona um usuário: salva sessão atual em backup e define sessão do alvo. */
export async function impersonateUser(targetUserId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(COOKIE_NAME)?.value;
  if (!currentToken) return false;
  const target = await getAuthUserById(targetUserId);
  if (!target) return false;
  const maxAge = JWT_EXPIRY_HOURS * 60 * 60;
  cookieStore.set(IMPERSONATION_BACKUP_COOKIE, currentToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
  await setSession(target);
  return true;
}

/** Restaura a sessão do admin (sai da impersonação). */
export async function exitImpersonation(): Promise<void> {
  const cookieStore = await cookies();
  const backupToken = cookieStore.get(IMPERSONATION_BACKUP_COOKIE)?.value;
  if (!backupToken) return;
  const maxAge = JWT_EXPIRY_HOURS * 60 * 60;
  cookieStore.set(COOKIE_NAME, backupToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
  cookieStore.delete(IMPERSONATION_BACKUP_COOKIE);
}

/** Atualiza a senha de qualquer usuário por ID. Apenas admin. */
export async function updateUserPasswordById(
  userId: string,
  newPassword: string
): Promise<void> {
  if (!newPassword || newPassword.length < 4) {
    throw new Error("Senha deve ter no mínimo 4 caracteres.");
  }
  const hash = await hashPassword(newPassword);
  await sql`
    UPDATE users SET password_hash = ${hash}, updated_at = now()
    WHERE id = ${userId}
  `;
}
