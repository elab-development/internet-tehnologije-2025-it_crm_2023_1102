import { prisma } from "../db/prisma";
import type { Role } from "../auth/jwt";
import { getScopeUserIds } from "./access";

/**
 * SK12: Metrike tima (sales_manager) ili globalno (admin).
 * Vraća:
 * - broj prilika po fazama
 * - broj dobijenih poslova (stage === 'won')
 * - ukupna procenjena vrednost (sum estimatedValue)
 *
 * Napomena: Pošto u Opportunity nema createdAt, filtriramo po expectedCloseDate.
 */
export async function getTeamMetrics(
  auth: { userId: number; role: Role },
  range?: { from?: string; to?: string }
) {
  const scopeUserIds = await getScopeUserIds(auth.userId, auth.role);

  const where: any = {};

  if (scopeUserIds) {
    where.OR = [
      { salesManagerId: { in: scopeUserIds } },
      { freelanceConsultantId: { in: scopeUserIds } },
    ];
  }

  if (range?.from || range?.to) {
    where.expectedCloseDate = {};
    if (range.from) where.expectedCloseDate.gte = new Date(range.from);
    if (range.to) where.expectedCloseDate.lte = new Date(range.to);
  }

  const rows = await prisma.opportunity.findMany({
    where,
    select: { stage: true, estimatedValue: true },
  });

  const opportunitiesByStage: Record<string, number> = {};
  let wonDeals = 0;
  let totalEstimatedValue = 0;

  for (const r of rows) {
    opportunitiesByStage[r.stage] = (opportunitiesByStage[r.stage] || 0) + 1;
    totalEstimatedValue += r.estimatedValue;
    if (r.stage === "won") wonDeals += 1;
  }

  return {
    totalOpportunities: rows.length,
    opportunitiesByStage,
    wonDeals,
    totalEstimatedValue,
  };
}
