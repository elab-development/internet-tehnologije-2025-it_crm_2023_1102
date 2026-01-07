import { cookies } from "next/headers";
import { SESSION_TTL_MINUTES, type JwtPayload, signToken } from "./jwt";

/**
 * Cookie name treba da bude specifičan za aplikaciju.
 */
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "itcrm_session";

/**
 * Postavlja session cookie.
 * httpOnly sprečava JS pristup (XSS zaštita).
 */
export async function setSessionCookie(token: string) {
  const c = await cookies();

  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * SESSION_TTL_MINUTES,
  });
}

/**
 * Briše session cookie.
 */
export async function clearSessionCookie() {
  const c = await cookies();

  c.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Vraća token iz cookie-ja ili null.
 */
export async function getSessionCookie() {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value || null;
}

/**
 * Sliding session: na svakom request-u možeš osvežiti cookie.
 * Ovo pomaže da “25 minuta neaktivnosti” bude realno neaktivnost, a ne samo exp moment.
 */
export async function refreshSessionCookie(payload: JwtPayload) {
  const freshToken = signToken(payload);
  await setSessionCookie(freshToken);
  return freshToken;
}
