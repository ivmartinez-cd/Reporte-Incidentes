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
    return { error: "Ingresa usuario y contrasena." };
  }
  if (!verifyCredentials(username, password)) {
    return { error: "Credenciales invalidas." };
  }

  await setSessionCookie(username);
  // Tras autenticar, el usuario elige cliente a proposito (no se autoselecciona
  // ninguno): vamos a la pantalla de seleccion, no directo al dashboard.
  redirect("/seleccion");
}
