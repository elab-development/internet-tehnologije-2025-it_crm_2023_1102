import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export type UserRole = "admin" | "sales_manager" | "it_consultant";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Kreira token za ulogovanog korisnika.
export function createToken(user: AuthUser) {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: "7d",
  });
}

// Čita korisnika iz cookie tokena.
export function getAuthUser(request: NextRequest): AuthUser | null {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return null;
    }

    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

// Proverava da li korisnik ima dozvoljenu ulogu.
export function hasRole(user: AuthUser | null, roles: UserRole[]) {
  if (!user) {
    return false;
  }

  return roles.includes(user.role);
}