import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { clientCompanyUpdateSchema } from "@/src/server/validators/clientCompany";
import { getClientCompanyById, updateClientCompany } from "@/src/server/services/clientCompanyService";

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    const id = Number(ctx.params.id);

    const company = await getClientCompanyById({ userId: auth.sub, role: auth.role }, id);
    return ok(company);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["admin", "sales_manager"]);

    const id = Number(ctx.params.id);
    const body = await req.json();

    const parsed = clientCompanyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Validacija nije prošla." }, { status: 422 });
    }

    // Sales manager ne sme da menja tuđe klijente.
    if (auth.role === "sales_manager") {
      const existing = await getClientCompanyById({ userId: auth.sub, role: auth.role }, id);
      if (existing.salesManagerId !== auth.sub) {
        return NextResponse.json({ message: "Zabranjeno." }, { status: 403 });
      }
    }

    const updated = await updateClientCompany(id, parsed.data);
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
