"use server";

import { redirect } from "next/navigation";
import {
  validateLogin,
  setSession,
  clearSession,
  type AuthUser,
  type UserRole,
} from "./auth";

export async function loginAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const login = (formData.get("login") as string)?.trim() ?? "";
  const password = (formData.get("password") as string) ?? "";

  if (!login || !password) {
    return { error: "Preencha usuário e senha." };
  }

  const user = await validateLogin(login, password);
  if (!user) {
    return { error: "Usuário ou senha incorretos." };
  }

  await setSession(user);
  return { success: true };
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function getSessionAction(): Promise<AuthUser | null> {
  const { getSession } = await import("./auth");
  return getSession();
}
