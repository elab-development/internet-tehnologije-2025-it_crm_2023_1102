import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { registerSchema } from "@/src/server/validators/auth";
import { registerUser } from "@/src/server/services/authService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Validacija nije prošla." }, { status: 422 });
    }

    const user = await registerUser(parsed.data);
    return ok(user, 201);
  } catch (e) {
    return handleError(e);
  }
}
