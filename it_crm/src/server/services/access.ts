import { prisma } from "../db/prisma";
import type { Role } from "../auth/jwt";

/**
 * Centralna logika ograničenja pristupa (RBAC + data scoping).
 * Admin vidi sve.
 * Sales manager vidi svoje i timske (freelanceri gde je managerId = smId).
 * Freelancer vidi samo svoje.
 */

export async function getScopeUserIds(userId: number, role: Role) {
  if (role === "admin") return null; // null = nema ograničenja.

  if (role === "sales_manager") {
    const team = await prisma.user.findMany({
      where: { managerId: userId },
      select: { id: true },
    });

    // Sales manager + svi njegovi freelanceri.
    return [userId, ...team.map((t) => t.id)];
  }

  // Freelance consultant.
  return [userId];
}
