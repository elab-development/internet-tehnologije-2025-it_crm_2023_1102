import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { clientCompanyUpdateSchema } from "@/src/server/validators/clientCompany";
import { getClientCompanyById, updateClientCompany } from "@/src/server/services/clientCompanyService";

type Ctx =
  | { params: { id?: string } }
  | { params: Promise<{ id?: string }> };

function parseIdFromString(raw: unknown) {
  const s = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
  const cleaned = s.trim().replace(/\/+$/, "").split("?")[0];
  const id = Number(cleaned);
  return { raw: s, cleaned, id };
}

function parseIdFallback(req: NextRequest) {
  // /api/client-companies/12 -> ["api","client-companies","12"]
  const last = req.nextUrl.pathname.split("/").filter(Boolean).at(-1) ?? "";
  return parseIdFromString(last);
}

export async function GET(req: NextRequest, context: Ctx) {
  try {
    const auth = await requireAuth();

    // ✅ Next sometimes gives params as Promise.
    const params = await Promise.resolve((context as any).params);

    const userId = Number((auth as any).sub ?? (auth as any).userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ message: "Neispravan user id." }, { status: 401 });
    }

    // ✅ Read id from params, fallback to URL.
    let parsed = parseIdFromString(params?.id);
    if (!Number.isInteger(parsed.id) || parsed.id <= 0) {
      parsed = parseIdFallback(req);
    }

    if (!Number.isInteger(parsed.id) || parsed.id <= 0) {
      return NextResponse.json(
        { message: "Neispravan ID.", debug: { fromParams: params?.id, ...parsed } },
        { status: 400 }
      );
    }

    const company = await getClientCompanyById(
      { userId, role: (auth as any).role },
      parsed.id
    );

    return ok(company);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    const auth = await requireAuth();
    requireRole((auth as any).role, ["admin", "sales_manager"]);

    const params = await Promise.resolve((context as any).params);

    const userId = Number((auth as any).sub ?? (auth as any).userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ message: "Neispravan user id." }, { status: 401 });
    }

    let parsed = parseIdFromString(params?.id);
    if (!Number.isInteger(parsed.id) || parsed.id <= 0) {
      parsed = parseIdFallback(req);
    }

    if (!Number.isInteger(parsed.id) || parsed.id <= 0) {
      return NextResponse.json(
        { message: "Neispravan ID.", debug: { fromParams: params?.id, ...parsed } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const z = clientCompanyUpdateSchema.safeParse(body);
    if (!z.success) {
      return NextResponse.json(
        { message: z.error.issues[0]?.message || "Validacija nije prošla." },
        { status: 422 }
      );
    }

    if ((auth as any).role === "sales_manager") {
      const existing = await getClientCompanyById({ userId, role: (auth as any).role }, parsed.id);
      if (existing.salesManagerId !== userId) {
        return NextResponse.json({ message: "Zabranjeno." }, { status: 403 });
      }
    }

    const updated = await updateClientCompany(parsed.id, z.data);
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
