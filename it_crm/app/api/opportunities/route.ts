import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { opportunityCreateSchema } from "@/src/server/validators/opportunity";
import { listOpportunities, createOpportunity } from "@/src/server/services/opportunityService";
import { prisma } from "@/src/server/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);

    const res = await listOpportunities(
      { userId: auth.sub, role: auth.role },
      {
        q: searchParams.get("q") ?? undefined,
        stage: searchParams.get("stage") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
        pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 20,
      }
    );

    return ok(res);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["admin", "sales_manager", "freelance_consultant"]);

    const body = await req.json();
    const parsed = opportunityCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Validacija nije prošla." }, { status: 422 });
    }

    // Contact mora postojati.
    const contact = await prisma.contact.findUnique({ where: { id: parsed.data.contactId } });
    if (!contact) return NextResponse.json({ message: "Kontakt ne postoji." }, { status: 404 });

    if (auth.role === "sales_manager") {
      // SM kreira samo za svoj tim.
      if (parsed.data.salesManagerId !== auth.sub) {
        return NextResponse.json({ message: "salesManagerId mora biti ulogovani sales menadžer." }, { status: 422 });
      }
      if (contact.salesManagerId !== auth.sub) {
        return NextResponse.json({ message: "Kontakt mora pripadati tvom timu." }, { status: 403 });
      }
    }

    if (auth.role === "freelance_consultant") {
      // Freelancer kreira samo za svoje.
      if (parsed.data.freelanceConsultantId !== auth.sub) {
        return NextResponse.json({ message: "freelanceConsultantId mora biti ulogovani freelancer." }, { status: 422 });
      }
      if (contact.freelanceConsultantId !== auth.sub) {
        return NextResponse.json({ message: "Kontakt mora pripadati tebi." }, { status: 403 });
      }
      if (parsed.data.salesManagerId !== contact.salesManagerId) {
        return NextResponse.json({ message: "salesManagerId mora odgovarati sales menadžeru kontakta." }, { status: 422 });
      }
    }

    const created = await createOpportunity(parsed.data);
    return ok(created, 201);
  } catch (e) {
    return handleError(e);
  }
}
