import { type NextRequest } from "next/server";
import { ok, handleError } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { prisma } from "@/src/server/db/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["sales_manager"]);

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") ?? undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const pageSize = searchParams.get("pageSize") ? Math.min(Number(searchParams.get("pageSize")), 50) : 50;

    const where: any = {
      role: "freelance_consultant",
      managerId: auth.sub,
      isActive: true,
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
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

    return ok({ items, total, page, pageSize });
  } catch (e) {
    return handleError(e);
  }
}
