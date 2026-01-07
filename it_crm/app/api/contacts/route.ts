import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { contactCreateSchema } from "@/src/server/validators/contact";
import { listContacts, createContact } from "@/src/server/services/contactService";
import { prisma } from "@/src/server/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);

    const res = await listContacts(
      { userId: auth.sub, role: auth.role },
      {
        q: searchParams.get("q") ?? undefined,
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
    const parsed = contactCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Validacija nije prošla." }, { status: 422 });
    }

    // Provera da kontakt pripada kompaniji koju korisnik sme da vidi.
    const company = await prisma.clientCompany.findUnique({ where: { id: parsed.data.clientCompanyId } });
    if (!company) return NextResponse.json({ message: "Klijent ne postoji." }, { status: 404 });

    if (auth.role === "sales_manager") {
      if (company.salesManagerId !== auth.sub) return NextResponse.json({ message: "Zabranjeno." }, { status: 403 });

      // SM kreira kontakt: owners moraju biti konzistentni.
      if (parsed.data.salesManagerId !== auth.sub) {
        return NextResponse.json({ message: "salesManagerId mora biti ulogovani sales menadžer." }, { status: 422 });
      }
    }

    if (auth.role === "freelance_consultant") {
      if (company.freelanceConsultantId !== auth.sub) return NextResponse.json({ message: "Zabranjeno." }, { status: 403 });

      // Freelancer ne sme da upiše tuđe owner-e.
      if (parsed.data.freelanceConsultantId !== auth.sub) {
        return NextResponse.json({ message: "freelanceConsultantId mora biti ulogovani freelancer." }, { status: 422 });
      }
      if (parsed.data.salesManagerId !== company.salesManagerId) {
        return NextResponse.json({ message: "salesManagerId mora odgovarati sales menadžeru klijenta." }, { status: 422 });
      }
    }

    const created = await createContact(parsed.data);
    return ok(created, 201);
  } catch (e) {
    return handleError(e);
  }
}
