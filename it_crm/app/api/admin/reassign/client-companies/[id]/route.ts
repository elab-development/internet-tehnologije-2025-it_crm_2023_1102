import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { reassignClientCompanyOwners } from "@/src/server/services/clientCompanyService";

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["admin"]);

    const clientCompanyId = Number(ctx.params.id);
    const body = await req.json();

    if (!body?.salesManagerId || !body?.freelanceConsultantId) {
      return NextResponse.json({ message: "Nedostaju salesManagerId ili freelanceConsultantId." }, { status: 422 });
    }

    const updated = await reassignClientCompanyOwners({
      clientCompanyId,
      salesManagerId: Number(body.salesManagerId),
      freelanceConsultantId: Number(body.freelanceConsultantId),
    });

    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
