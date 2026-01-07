import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { loginSchema } from "@/src/server/validators/auth";
import { login } from "@/src/server/services/authService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Validacija nije prošla." }, { status: 422 });
    }

    const user = await login(parsed.data);
    return ok(user);
  } catch (e) {
    return handleError(e);
  }
}
