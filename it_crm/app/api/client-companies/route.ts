import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { clientCompanyCreateSchema } from "@/src/server/validators/clientCompany";
import { listClientCompanies, createClientCompany } from "@/src/server/services/clientCompanyService";
import { prisma } from "@/src/server/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();

    const { searchParams } = new URL(req.url);
    const res = await listClientCompanies(
      { userId: auth.sub, role: auth.role },
      {
        q: searchParams.get("q") ?? undefined,
        city: searchParams.get("city") ?? undefined,
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
    requireRole(auth.role, ["admin", "sales_manager"]);

    const body = await req.json();
    const parsed = clientCompanyCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Validacija nije prošla." }, { status: 422 });
    }

    // Business pravilo: sales_manager kreira samo za sebe.
    if (auth.role === "sales_manager" && parsed.data.salesManagerId !== auth.sub) {
      return NextResponse.json({ message: "Sales menadžer može kreirati klijenta samo za sebe." }, { status: 403 });
    }

    // Business pravilo: freelancer mora biti aktivan.
    const fc = await prisma.user.findUnique({ where: { id: parsed.data.freelanceConsultantId } });
    if (!fc || !fc.isActive) {
      return NextResponse.json({ message: "Freelancer ne postoji ili nije aktivan." }, { status: 422 });
    }

    // Ako SM kreira, freelancer mora biti iz njegovog tima.
    if (auth.role === "sales_manager" && fc.managerId !== auth.sub) {
      return NextResponse.json({ message: "Freelancer mora pripadati timu sales menadžera." }, { status: 422 });
    }

    const created = await createClientCompany(parsed.data);
    return ok(created, 201);
  } catch (e) {
    return handleError(e);
  }
}
