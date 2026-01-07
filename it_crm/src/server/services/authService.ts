import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "../auth/password";
import { signToken, type Role } from "../auth/jwt";
import { setSessionCookie, clearSessionCookie } from "../auth/session";

/**
 * Auth servis pokriva SK1-SK3: registracija, prijava, logout.
 * Loš input se zaustavlja u validatorima, ovde radimo poslovna pravila i DB.
 */

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  managerId?: number;
}) {
  // Validacija jedinstvenog email-a.
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error("Email je već zauzet."), { status: 409 });
  }

  // Pravilo: freelancer mora imati managerId.
  if (input.role === "freelance_consultant") {
    if (!input.managerId) {
      throw Object.assign(new Error("Freelancer mora imati dodeljenog sales manager-a."), { status: 422 });
    }

    const mgr = await prisma.user.findUnique({ where: { id: input.managerId } });
    if (!mgr || mgr.role !== "sales_manager" || !mgr.isActive) {
      throw Object.assign(new Error("Izabrani sales manager ne postoji ili nije aktivan."), { status: 422 });
    }
  }

  // Napomena: Tvoja šema zahteva managerId za SVE korisnike.
  // Zato za admin/sales_manager radimo “privremeni managerId”, pa odmah update na self.
  const hashed = await hashPassword(input.password);

  const allowAdminSignup = process.env.ALLOW_ADMIN_SIGNUP === "true";
  if (input.role === "admin" && !allowAdminSignup) {
    throw Object.assign(new Error("Registracija admin naloga nije dozvoljena."), { status: 403 });
  }

  // Moramo imati neki validan FK u managerId u trenutku create-a.
  // Ako postoji bar jedan admin, uzimamo njega kao privremeni managerId.
  let tempManagerId = input.managerId;

  if (input.role !== "freelance_consultant") {
    const anyAdmin = await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } });
    if (!anyAdmin) {
      throw Object.assign(
        new Error("Ne postoji admin u bazi. Kreiraj prvo admin nalog seed-om."),
        { status: 409 }
      );
    }
    tempManagerId = anyAdmin.id;
  }

  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashed,
      role: input.role,
      isActive: true,
      managerId: tempManagerId!,
    },
    select: { id: true, role: true, email: true, name: true, isActive: true, managerId: true },
  });

  // Ako je sales_manager/admin, postavi managerId na self (da “managerId required” bude smislen).
  if (input.role !== "freelance_consultant") {
    await prisma.user.update({
      where: { id: created.id },
      data: { managerId: created.id },
    });
  }

  return created;
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw Object.assign(new Error("Pogrešan email ili lozinka."), { status: 401 });
  if (!user.isActive) throw Object.assign(new Error("Nalog je deaktiviran."), { status: 403 });

  const ok = await verifyPassword(input.password, user.password);
  if (!ok) throw Object.assign(new Error("Pogrešan email ili lozinka."), { status: 401 });

  const token = signToken({ sub: user.id, role: user.role });
  await setSessionCookie(token);

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function logout() {
  await clearSessionCookie();
  return { ok: true };
}
