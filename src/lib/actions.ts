"use server";

import { redirect } from "next/navigation";
import {
  getSession,
  createOrUpdateUserForPlayer,
  updatePlayerUserRole,
  getPlayerUserRole,
  verifyMasterPassword as authVerifyMaster,
  hasMasterCookie,
  setMasterCookie,
  listAllUsers as authListUsers,
  updateUserPasswordById as authUpdateUserPassword,
  impersonateUser as authImpersonateUser,
  exitImpersonation as authExitImpersonation,
  hasImpersonationBackup,
  isAdmin,
} from "./auth";
import type { UserRole } from "./auth";
import {
  dbListPlayers,
  dbGetPlayer,
  dbSavePlayer,
  dbDeletePlayer,
  dbListCompositions,
  dbGetComposition,
  dbSaveComposition,
  dbDeleteComposition,
  type MembroData,
  type CompositionData,
} from "./db-data";

/** Exige sessão com JWT válido; redireciona para login se expirado/inválido. */
async function requireSession(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/");
}

/** Retorna o role do usuário logado. Usado para restringir opções de cargo. */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const session = await getSession();
  return session?.role ?? null;
}

// --- Senha mestra (admin) ---

/** Verifica se o admin precisa digitar a senha mestra. */
export async function needsMasterPassword(): Promise<boolean> {
  const session = await getSession();
  if (!session || !isAdmin(session)) return false;
  const ok = await hasMasterCookie();
  return !ok;
}

/** Valida a senha mestra e define o cookie em caso de sucesso. */
export async function verifyMasterPassword(password: string): Promise<boolean> {
  const session = await getSession();
  if (!session || !isAdmin(session)) return false;
  if (!authVerifyMaster(password)) return false;
  await setMasterCookie();
  return true;
}

// --- Gerenciar usuários (admin) ---

/** Lista todos os usuários. Apenas admin. Retorna também o ID do usuário logado. */
export async function getUsers(): Promise<{
  users: { id: string; login: string; role: UserRole; playerId: string | null; playerName?: string }[];
  currentUserId: string | null;
}> {
  const session = await getSession();
  if (!session) redirect("/");
  if (!isAdmin(session)) redirect("/home");
  const users = await authListUsers();
  return { users, currentUserId: session.id };
}

/** Atualiza a senha de um usuário. Apenas admin. */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/");
  if (!isAdmin(session)) redirect("/home");
  await authUpdateUserPassword(userId, newPassword);
}

/** Impersona um usuário (logar como). Apenas admin com senha mestra. */
export async function impersonateUser(targetUserId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) redirect("/");
  if (!isAdmin(session)) redirect("/home");
  const hasMaster = await hasMasterCookie();
  if (!hasMaster) return false;
  return authImpersonateUser(targetUserId);
}

/** Sai da impersonação e volta para a conta do admin. */
export async function exitImpersonation(): Promise<void> {
  await authExitImpersonation();
}

/** Verifica se está em modo impersonação. */
export async function isImpersonating(): Promise<boolean> {
  return hasImpersonationBackup();
}

// --- Players ---

export async function getMembers(): Promise<MembroData[]> {
  return dbListPlayers();
}

export async function getMember(id: string): Promise<MembroData | null> {
  return dbGetPlayer(id);
}

/** Retorna o cargo (role) do usuário vinculado ao membro, ou null. */
export async function getMemberUserRole(playerId: string): Promise<UserRole | null> {
  await requireSession();
  return getPlayerUserRole(playerId);
}

/** Retorna o perfil (player) do usuário logado, ou null se não houver vínculo. */
export async function getMyProfile(): Promise<MembroData | null> {
  const session = await getSession();
  if (!session) redirect("/");
  if (!session.playerId) return null;
  return dbGetPlayer(session.playerId);
}

export async function saveMember(
  data: Omit<MembroData, "id"> & {
    id?: string;
    password?: string;
    role?: UserRole;
  }
): Promise<MembroData> {
  const session = await getSession();
  if (!session) redirect("/");
  let role = data.role ?? "jogador";
  if (session.role === "gm" && role === "admin") {
    role = "jogador";
  }
  const saved = await dbSavePlayer(data);
  if (data.password?.trim()) {
    await createOrUpdateUserForPlayer(
      saved.id,
      data.playerName ?? saved.playerName ?? "",
      data.password.trim(),
      role
    );
  } else if (data.role) {
    await updatePlayerUserRole(saved.id, role);
  }
  return saved;
}

export async function deleteMember(id: string): Promise<void> {
  await requireSession();
  return dbDeletePlayer(id);
}

/** Salva o perfil do usuário logado. Só permite salvar o próprio perfil (playerId). */
export async function saveMyProfile(
  data: Omit<MembroData, "id"> & { id?: string; password?: string }
): Promise<MembroData | null> {
  const session = await getSession();
  if (!session) redirect("/");
  if (!session.playerId) return null;
  const playerId = session.playerId;
  if (data.id && data.id !== playerId) return null;
  const toSave = { ...data, id: playerId };
  const saved = await dbSavePlayer(toSave);
  if (data.password?.trim()) {
    await createOrUpdateUserForPlayer(
      saved.id,
      data.playerName ?? saved.playerName ?? "",
      data.password.trim(),
      session.role
    );
  }
  return saved;
}

// --- Compositions ---

export async function getCompositions(): Promise<CompositionData[]> {
  return dbListCompositions();
}

export async function getComposition(
  id: string
): Promise<CompositionData | null> {
  return dbGetComposition(id);
}

export async function saveComposition(
  data: Omit<CompositionData, "id"> & { id?: string }
): Promise<CompositionData> {
  await requireSession();
  return dbSaveComposition(data);
}

export async function deleteComposition(id: string): Promise<void> {
  await requireSession();
  return dbDeleteComposition(id);
}

/** Retorna a composição apenas se o jogador logado tem personagem nela. */
export async function getCompositionIfPlayerIn(
  id: string
): Promise<{ composition: CompositionData; playerId: string } | null> {
  const session = await getSession();
  if (!session) redirect("/");
  if (!session.playerId) return null;
  const comp = await dbGetComposition(id);
  if (!comp) return null;
  const hasSlot = (comp.slots ?? []).some(
    (s) => s != null && s.memberId === session.playerId
  );
  return hasSlot ? { composition: comp, playerId: session.playerId } : null;
}

/** Retorna composições em que o jogador logado tem pelo menos um personagem. */
export async function getMyCompositions(): Promise<{
  compositions: CompositionData[];
  playerId: string | null;
}> {
  const session = await getSession();
  if (!session) redirect("/");
  if (!session.playerId)
    return { compositions: [], playerId: null };
  const all = await dbListCompositions();
  const compositions = all.filter((c) =>
    (c.slots ?? []).some((s) => s != null && s.memberId === session.playerId)
  );
  return { compositions, playerId: session.playerId };
}
