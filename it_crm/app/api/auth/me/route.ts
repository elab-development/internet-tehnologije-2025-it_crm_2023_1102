import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { prisma } from "@/src/server/db/prisma";

export async function GET() {
  try {
    const auth = await requireAuth();

    const me = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { id: true, name: true, email: true, role: true, isActive: true, managerId: true },
    });

    return ok(me);
  } catch (e) {
    return handleError(e);
  }
}
