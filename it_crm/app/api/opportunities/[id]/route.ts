import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { opportunityUpdateSchema } from "@/src/server/validators/opportunity";
import { getOpportunityById, updateOpportunity } from "@/src/server/services/opportunityService";

type Ctx = { params: Promise<{ id: string }> };

function parseIdFromParam(idParam: string) {
  const s = String(idParam ?? "");
  const cleaned = s.trim().split("?")[0];
  const id = Number.parseInt(cleaned, 10);
  return { raw: s, cleaned, id };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAuth();

    const { id: idParam } = await ctx.params;
    const { raw, cleaned, id } = parseIdFromParam(idParam);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "Neispravan ID.", debug: { raw, cleaned } }, { status: 400 });
    }

    const userId = Number((auth as any).sub);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ message: "Neispravan user id." }, { status: 401 });
    }

    const opp = await getOpportunityById({ userId, role: auth.role }, id);
    return ok(opp);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["admin", "sales_manager", "freelance_consultant"]);

    const { id: idParam } = await ctx.params;
    const { raw, cleaned, id } = parseIdFromParam(idParam);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "Neispravan ID.", debug: { raw, cleaned } }, { status: 400 });
    }

    const userId = Number((auth as any).sub);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ message: "Neispravan user id." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = opportunityUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Validacija nije prošla." },
        { status: 422 }
      );
    }

    // (opciono) RBAC: proveri da user sme da menja tu priliku.
    await getOpportunityById({ userId, role: auth.role }, id);

    const updated = await updateOpportunity(id, parsed.data);
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
