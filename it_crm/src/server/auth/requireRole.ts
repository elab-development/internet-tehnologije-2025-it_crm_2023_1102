import type { Role } from "./jwt";

/**
 * Proverava da li korisnik ima neku od dozvoljenih uloga.
 * Baca grešku sa status=403 ako nema.
 */
export function requireRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  }
}
