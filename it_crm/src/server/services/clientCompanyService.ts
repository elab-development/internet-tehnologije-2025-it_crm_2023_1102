import { prisma } from "../db/prisma";
import type { Role } from "../auth/jwt";
import { getScopeUserIds } from "./access";

/**
 * ClientCompany servis:
 * - Admin: vidi sve.
 * - Sales manager: vidi svoje + timske (freelanceri kojima je manager).
 * - Freelancer: vidi samo svoje.
 */
export async function listClientCompanies(
  auth: { userId: number; role: Role },
  params: { q?: string; city?: string; status?: string; page?: number; pageSize?: number }
) {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 20, 50);

  const scopeUserIds = await getScopeUserIds(auth.userId, auth.role);

  const where: any = {};
  if (params.q) where.name = { contains: params.q, mode: "insensitive" };
  if (params.city) where.city = { contains: params.city, mode: "insensitive" };
  if (params.status) where.status = params.status;

  // RBAC data scope.
  if (scopeUserIds) {
    where.OR = [
      { salesManagerId: { in: scopeUserIds } },
      { freelanceConsultantId: { in: scopeUserIds } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.clientCompany.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true },
    }),
    prisma.clientCompany.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getClientCompanyById(auth: { userId: number; role: Role }, id: number) {
  const scopeUserIds = await getScopeUserIds(auth.userId, auth.role);

  const company = await prisma.clientCompany.findUnique({
    where: { id },
    include: { category: true, contacts: true, opportunities: true },
  });

  if (!company) throw Object.assign(new Error("Klijent nije pronađen."), { status: 404 });

  // RBAC check (admin = sve).
  if (scopeUserIds) {
    const allowed =
      scopeUserIds.includes(company.salesManagerId) || scopeUserIds.includes(company.freelanceConsultantId);
    if (!allowed) throw Object.assign(new Error("Zabranjeno."), { status: 403 });
  }

  return company;
}

export async function createClientCompany(data: {
  name: string;
  industry: string;
  companySize: string;
  website?: string | null;
  country: string;
  city: string;
  address: string;
  status: string;
  categoryId: number;
  salesManagerId: number;
  freelanceConsultantId: number;
}) {
  // Minimalne nelogičnosti (bez dictionary).
  if (!data.name?.trim()) throw Object.assign(new Error("Naziv klijenta je obavezan."), { status: 422 });

  return prisma.clientCompany.create({ data });
}

export async function updateClientCompany(id: number, data: Partial<{
  name: string;
  industry: string;
  companySize: string;
  website?: string | null;
  country: string;
  city: string;
  address: string;
  status: string;
  categoryId: number;
  salesManagerId: number;
  freelanceConsultantId: number;
}>) {
  return prisma.clientCompany.update({ where: { id }, data });
}

/**
 * Admin-only: promena vlasnika klijenta.
 * Provera: novi vlasnici moraju postojati i biti aktivni.
 */
export async function reassignClientCompanyOwners(input: {
  clientCompanyId: number;
  salesManagerId: number;
  freelanceConsultantId: number;
}) {
  const [sm, fc] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.salesManagerId } }),
    prisma.user.findUnique({ where: { id: input.freelanceConsultantId } }),
  ]);

  if (!sm || !sm.isActive) throw Object.assign(new Error("Sales manager ne postoji ili nije aktivan."), { status: 422 });
  if (!fc || !fc.isActive) throw Object.assign(new Error("Freelancer ne postoji ili nije aktivan."), { status: 422 });

  return prisma.clientCompany.update({
    where: { id: input.clientCompanyId },
    data: {
      salesManagerId: input.salesManagerId,
      freelanceConsultantId: input.freelanceConsultantId,
    },
  });
}
