import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { prisma } from "@/src/server/db/prisma";

export async function GET() {
  try {
    await requireAuth();
    const items = await prisma.clientCategory.findMany({ orderBy: { name: "asc" } });
    return ok(items);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["admin"]);

    const body = await req.json();
    if (!body?.name) return NextResponse.json({ message: "Naziv kategorije je obavezan." }, { status: 422 });

    const created = await prisma.clientCategory.create({
      data: {
        name: String(body.name).trim(),
        description: body.description ? String(body.description).trim() : null,
      },
    });

    return ok(created, 201);
  } catch (e) {
    return handleError(e);
  }
}
