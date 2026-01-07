import { prisma } from "../db/prisma";
import type { Role } from "../auth/jwt";
import { getScopeUserIds } from "./access";

/**
 * Contact servis:
 * - Admin: sve.
 * - Sales manager: kontakti za klijente svog tima.
 * - Freelancer: kontakti samo za svoje klijente.
 */
export async function listContacts(
  auth: { userId: number; role: Role },
  params: { q?: string; page?: number; pageSize?: number }
) {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 20, 50);

  const scopeUserIds = await getScopeUserIds(auth.userId, auth.role);

  const where: any = {};
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
    ];
  }

  if (scopeUserIds) {
    where.OR = where.OR ?? [];
    where.OR.push(
      { salesManagerId: { in: scopeUserIds } },
      { freelanceConsultantId: { in: scopeUserIds } }
    );
  }

  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { clientCompany: true },
    }),
    prisma.contact.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getContactById(auth: { userId: number; role: Role }, id: number) {
  const scopeUserIds = await getScopeUserIds(auth.userId, auth.role);

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { clientCompany: true, opportunities: true },
  });

  if (!contact) throw Object.assign(new Error("Kontakt nije pronađen."), { status: 404 });

  if (scopeUserIds) {
    const allowed =
      scopeUserIds.includes(contact.salesManagerId) || scopeUserIds.includes(contact.freelanceConsultantId);
    if (!allowed) throw Object.assign(new Error("Zabranjeno."), { status: 403 });
  }

  return contact;
}

export async function createContact(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  notes?: string | null;
  clientCompanyId: number;
  salesManagerId: number;
  freelanceConsultantId: number;
}) {
  if (!data.name?.trim()) throw Object.assign(new Error("Ime kontakta je obavezno."), { status: 422 });

  return prisma.contact.create({ data });
}

export async function updateContact(id: number, data: Partial<{
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  notes?: string | null;
  clientCompanyId: number;
  salesManagerId: number;
  freelanceConsultantId: number;
}>) {
  return prisma.contact.update({ where: { id }, data });
}

/**
 * Admin-only: promena vlasnika kontakta.
 */
export async function reassignContactOwners(input: {
  contactId: number;
  salesManagerId: number;
  freelanceConsultantId: number;
}) {
  const [sm, fc] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.salesManagerId } }),
    prisma.user.findUnique({ where: { id: input.freelanceConsultantId } }),
  ]);

  if (!sm || !sm.isActive) throw Object.assign(new Error("Sales manager ne postoji ili nije aktivan."), { status: 422 });
  if (!fc || !fc.isActive) throw Object.assign(new Error("Freelancer ne postoji ili nije aktivan."), { status: 422 });

  return prisma.contact.update({
    where: { id: input.contactId },
    data: {
      salesManagerId: input.salesManagerId,
      freelanceConsultantId: input.freelanceConsultantId,
    },
  });
}
