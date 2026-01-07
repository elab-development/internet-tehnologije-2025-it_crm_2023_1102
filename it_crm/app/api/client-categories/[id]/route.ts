import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { prisma } from "@/src/server/db/prisma";

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["admin"]);

    const id = Number(ctx.params.id);
    const body = await req.json();

    const updated = await prisma.clientCategory.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
      },
    });

    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
