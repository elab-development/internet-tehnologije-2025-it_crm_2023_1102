import jwt, { type JwtPayload as LibJwtPayload } from "jsonwebtoken";

/**
 * Role tip mora da bude usklađen sa Prisma enum-om UserRole.
 * Ove vrednosti koristiš u autentifikaciji i autorizaciji.
 */
export type Role = "admin" | "sales_manager" | "freelance_consultant";

/**
 * JWT payload koji koristimo u aplikaciji.
 * sub = userId (standardna claim vrednost).
 * role = korisnička uloga.
 */
export type JwtPayload = {
  sub: number;
  role: Role;
};

/**
 * Tajni ključ mora da bude u .env (JWT_SECRET).
 * Default vrednost je samo za razvoj, nikad za produkciju.
 */
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

/**
 * TTL sesije po zahtevu: 25 minuta neaktivnosti.
 * U praksi, TTL se može implementirati “sliding” tako što osvežavaš cookie na svakom request-u.
 * Ovde usklađujemo i JWT i cookie na 25 min.
 */
export const SESSION_TTL_MINUTES = Number(process.env.SESSION_TTL_MINUTES || 25);

/**
 * Kreira JWT sa istekom.
 */
export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_TTL_MINUTES}m` });
}

function isRole(v: unknown): v is Role {
  return v === "admin" || v === "sales_manager" || v === "freelance_consultant";
}

/**
 * Verifikuje JWT i vraća normalizovan payload.
 * Baca grešku sa status=401 ako je token nevalidan/istekao.
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // jsonwebtoken može vratiti string ili objekat.
    if (typeof decoded === "string") {
      throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
    }

    const obj = decoded as LibJwtPayload & Record<string, unknown>;

    // sub može biti string/number, pa normalizujemo.
    const subRaw = obj.sub;
    const sub =
      typeof subRaw === "number"
        ? subRaw
        : typeof subRaw === "string"
        ? Number(subRaw)
        : NaN;

    const role = obj.role;

    if (!Number.isInteger(sub) || sub <= 0 || !isRole(role)) {
      throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
    }

    return { sub, role };
  } catch {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
}
