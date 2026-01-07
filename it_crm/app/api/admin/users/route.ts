import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { userListQuerySchema } from "@/src/server/validators/user";
import { createUser, listUsers } from "@/src/server/services/userService";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["admin"]);

    const { searchParams } = new URL(req.url);
    const parsed = userListQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      role: searchParams.get("role") ?? undefined,
      isActive: searchParams.get("isActive") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Validacija nije prošla." }, { status: 422 });
    }

    const page = parsed.data.page ? Number(parsed.data.page) : 1;
    const pageSize = parsed.data.pageSize ? Number(parsed.data.pageSize) : 20;

    const res = await listUsers({
      q: parsed.data.q,
      role: parsed.data.role,
      isActive: parsed.data.isActive ? parsed.data.isActive === "true" : undefined,
      page,
      pageSize,
    });

    return ok(res);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["admin"]);

    const body = await req.json();

    // Minimalna validacija inline (jer nemaš posebnu create šemu za admin create).
    if (!body?.name || !body?.email || !body?.password || !body?.role || !body?.managerId) {
      return NextResponse.json({ message: "Nedostaju obavezna polja." }, { status: 422 });
    }

    const user = await createUser({
      name: String(body.name),
      email: String(body.email).toLowerCase(),
      password: String(body.password),
      role: body.role,
      managerId: Number(body.managerId),
    });

    return ok(user, 201);
  } catch (e) {
    return handleError(e);
  }
}
