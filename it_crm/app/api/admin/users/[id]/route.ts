import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { userUpdateSchema } from "@/src/server/validators/user";
import { updateUser } from "@/src/server/services/userService";

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["admin"]);

    const id = Number(ctx.params.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ message: "Nevalidan ID." }, { status: 422 });
    }

    const body = await req.json();
    const parsed = userUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Validacija nije prošla." }, { status: 422 });
    }

    const user = await updateUser(id, parsed.data);
    return ok(user);
  } catch (e) {
    return handleError(e);
  }
}
