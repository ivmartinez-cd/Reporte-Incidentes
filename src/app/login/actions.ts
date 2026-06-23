"use server";

import { redirect } from "next/navigation";
import { verifyCredentials, setSessionCookie } from "@/lib/auth/session";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Ingresá usuario y contraseña." };
  }
  if (!verifyCredentials(username, password)) {
    return { error: "Credenciales inválidas." };
  }

  await setSessionCookie(username);
  redirect("/dashboard");
}
