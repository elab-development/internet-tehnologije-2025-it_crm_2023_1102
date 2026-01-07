import { prisma } from "../db/prisma";
import type { Role } from "../auth/jwt";
import { getScopeUserIds } from "./access";

/**
 * Opportunity servis:
 * - Validacije: naslov obavezan, estimatedValue >= 0, probability 0..1.
 * - RBAC: admin sve; SM svoj tim; freelancer svoje.
 */
export async function listOpportunities(
  auth: { userId: number; role: Role },
  params: { q?: string; stage?: string; status?: string; page?: number; pageSize?: number }
) {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 20, 50);

  const scopeUserIds = await getScopeUserIds(auth.userId, auth.role);

  const where: any = {};
  if (params.q) where.title = { contains: params.q, mode: "insensitive" };
  if (params.stage) where.stage = params.stage;
  if (params.status) where.status = params.status;

  if (scopeUserIds) {
    where.OR = [
      { salesManagerId: { in: scopeUserIds } },
      { freelanceConsultantId: { in: scopeUserIds } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { contact: true, clientCompany: true },
    }),
    prisma.opportunity.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getOpportunityById(auth: { userId: number; role: Role }, id: number) {
  const scopeUserIds = await getScopeUserIds(auth.userId, auth.role);

  const opp = await prisma.opportunity.findUnique({
    where: { id },
    include: { contact: true, clientCompany: true },
  });

  if (!opp) throw Object.assign(new Error("Prilika nije pronađena."), { status: 404 });

  if (scopeUserIds) {
    const allowed =
      scopeUserIds.includes(opp.salesManagerId) || scopeUserIds.includes(opp.freelanceConsultantId);
    if (!allowed) throw Object.assign(new Error("Zabranjeno."), { status: 403 });
  }

  return opp;
}

function validateOpportunityInput(data: any) {
  if (data.title !== undefined && !String(data.title).trim()) {
    throw Object.assign(new Error("Naslov prilike je obavezan."), { status: 422 });
  }
  if (data.estimatedValue !== undefined && Number(data.estimatedValue) < 0) {
    throw Object.assign(new Error("Procenjena vrednost ne može biti negativna."), { status: 422 });
  }
  if (data.probability !== undefined) {
    const p = Number(data.probability);
    if (p < 0 || p > 1) {
      throw Object.assign(new Error("Verovatnoća mora biti u opsegu 0..1."), { status: 422 });
    }
  }
}

export async function createOpportunity(data: {
  title: string;
  description?: string | null;
  stage: string;
  status: string;
  estimatedValue: number;
  currency: string;
  probability: number;
  expectedCloseDate?: string | null;
  contactId: number;
  salesManagerId: number;
  freelanceConsultantId: number;
  clientCompanyId?: number | null;
}) {
  validateOpportunityInput(data);

  return prisma.opportunity.create({
    data: {
      ...data,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
    },
  });
}

export async function updateOpportunity(id: number, data: Partial<{
  title: string;
  description?: string | null;
  stage: string;
  status: string;
  estimatedValue: number;
  currency: string;
  probability: number;
  expectedCloseDate?: string | null;
  contactId: number;
  salesManagerId: number;
  freelanceConsultantId: number;
  clientCompanyId?: number | null;
}>) {
  validateOpportunityInput(data);

  return prisma.opportunity.update({
    where: { id },
    data: {
      ...data,
      expectedCloseDate:
        data.expectedCloseDate !== undefined
          ? data.expectedCloseDate
            ? new Date(data.expectedCloseDate)
            : null
          : undefined,
    },
  });
}

/**
 * Admin-only: promena vlasnika prilike.
 */
export async function reassignOpportunityOwners(input: {
  opportunityId: number;
  salesManagerId: number;
  freelanceConsultantId: number;
}) {
  const [sm, fc] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.salesManagerId } }),
    prisma.user.findUnique({ where: { id: input.freelanceConsultantId } }),
  ]);

  if (!sm || !sm.isActive) throw Object.assign(new Error("Sales manager ne postoji ili nije aktivan."), { status: 422 });
  if (!fc || !fc.isActive) throw Object.assign(new Error("Freelancer ne postoji ili nije aktivan."), { status: 422 });

  return prisma.opportunity.update({
    where: { id: input.opportunityId },
    data: {
      salesManagerId: input.salesManagerId,
      freelanceConsultantId: input.freelanceConsultantId,
    },
  });
}
