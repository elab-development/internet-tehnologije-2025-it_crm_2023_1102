import bcrypt from "bcryptjs";

/**
 * Hash lozinke mora biti obavezan bezbednosni zahtev.
 * Nikada se ne čuva plain text lozinka u bazi.
 */
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string) {
  return bcrypt.compare(plain, hashed);
}
