import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { contactUpdateSchema } from "@/src/server/validators/contact";
import { getContactById, updateContact } from "@/src/server/services/contactService";

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    const id = Number(ctx.params.id);

    const contact = await getContactById({ userId: auth.sub, role: auth.role }, id);
    return ok(contact);
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

    const parsed = contactUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Validacija nije prošla." }, { status: 422 });
    }

    // RBAC: sme da menja samo svoje/timske.
    const existing = await getContactById({ userId: auth.sub, role: auth.role }, id);

    if (auth.role === "sales_manager" && existing.salesManagerId !== auth.sub) {
      return NextResponse.json({ message: "Zabranjeno." }, { status: 403 });
    }

    if (auth.role === "freelance_consultant" && existing.freelanceConsultantId !== auth.sub) {
      return NextResponse.json({ message: "Zabranjeno." }, { status: 403 });
    }

    const updated = await updateContact(id, parsed.data);
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
