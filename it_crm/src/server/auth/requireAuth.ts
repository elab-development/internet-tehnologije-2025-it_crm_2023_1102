import { getSessionCookie, refreshSessionCookie } from "./session";
import { verifyToken } from "./jwt";

/**
 * Vraća payload iz JWT-a (userId + role).
 * Baca grešku sa status=401 ako korisnik nije autentifikovan.
 * Ujedno radi i osvežavanje cookie-ja (sliding session).
 */
export async function requireAuth() {
  const token = await getSessionCookie();

  if (!token) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }

  const payload = verifyToken(token);

  // Osveži sesiju po svakom zahtevu (nonfunctional: automatski logout posle 25 min neaktivnosti).
  await refreshSessionCookie(payload);

  return payload;
}
