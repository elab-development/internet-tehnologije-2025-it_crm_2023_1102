import { prisma } from "../db/prisma";
import { hashPassword } from "../auth/password";

/**
 * Admin zahtevi: pregled, pretraga/filter, kreiranje/izmena/deaktivacija korisnika.
 * Ovaj servis pretpostavlja da si već proverila requireRole(admin) u handleru.
 */

export async function listUsers(params: {
  q?: string;
  role?: "admin" | "sales_manager" | "freelance_consultant";
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 20, 50);

  const where: any = {};
  if (params.role) where.role = params.role;
  if (typeof params.isActive === "boolean") where.isActive = params.isActive;

  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, email: true, role: true, isActive: true, managerId: true },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function updateUser(userId: number, data: any) {
  // Email unique je već na DB nivou, ali je korisno imati jasnu poruku.
  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== userId) {
      throw Object.assign(new Error("Email je već zauzet."), { status: 409 });
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true, managerId: true },
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "sales_manager" | "freelance_consultant";
  managerId: number;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw Object.assign(new Error("Email je već zauzet."), { status: 409 });

  const hashed = await hashPassword(data.password);

  // Admin kreira korisnika direktno.
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role,
      isActive: true,
      managerId: data.managerId,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, managerId: true },
  });

  // Ako je sales_manager/admin, postavi managerId na self (zbog tvoje šeme).
  if (data.role !== "freelance_consultant") {
    await prisma.user.update({ where: { id: user.id }, data: { managerId: user.id } });
  }

  return user;
}
