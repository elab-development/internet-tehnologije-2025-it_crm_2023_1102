import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { opportunityUpdateSchema } from "@/src/server/validators/opportunity";
import { getOpportunityById, updateOpportunity } from "@/src/server/services/opportunityService";

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    const id = Number(ctx.params.id);

    const opp = await getOpportunityById({ userId: auth.sub, role: auth.role }, id);
    return ok(opp);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["admin", "sales_manager", "freelance_consultant"]);

    const id = Number(ctx.params.id);
    const body = await req.json();

    const parsed = opportunityUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Validacija nije prošla." }, { status: 422 });
    }

    const existing = await getOpportunityById({ userId: auth.sub, role: auth.role }, id);

    if (auth.role === "sales_manager" && existing.salesManagerId !== auth.sub) {
      return NextResponse.json({ message: "Zabranjeno." }, { status: 403 });
    }

    if (auth.role === "freelance_consultant" && existing.freelanceConsultantId !== auth.sub) {
      return NextResponse.json({ message: "Zabranjeno." }, { status: 403 });
    }

    const updated = await updateOpportunity(id, parsed.data);
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
