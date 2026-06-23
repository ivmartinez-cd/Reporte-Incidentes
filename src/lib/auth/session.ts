import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { SESSION_COOKIE } from "./constants";

/**
 * Autenticación "login simple": credenciales por variables de entorno y una
 * cookie de sesión firmada con HMAC-SHA256. No hay base de usuarios.
 *
 * La verificación criptográfica fuerte ocurre en el servidor (este módulo).
 * El middleware sólo hace una comprobación de presencia para la redirección.
 */

export { SESSION_COOKIE };
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

interface SessionPayload {
  u: string;
  exp: number;
}

function sign(data: string): string {
  return crypto
    .createHmac("sha256", config.auth.sessionSecret)
    .update(data)
    .digest("base64url");
}

export function createToken(username: string): string {
  const payload: SessionPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyCredentials(username: string, password: string): boolean {
  const okUser = safeEqual(username, config.auth.username);
  const okPass =
    config.auth.password.length > 0 &&
    safeEqual(password, config.auth.password);
  return okUser && okPass;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export async function getCurrentUser(): Promise<string | null> {
  const jar = await cookies();
  const payload = verifyToken(jar.get(SESSION_COOKIE)?.value);
  return payload?.u ?? null;
}

export async function setSessionCookie(username: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createToken(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
