import { type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { requireRole } from "@/src/server/auth/requireRole";
import { getTeamMetrics } from "@/src/server/services/metricsService";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    requireRole(auth.role, ["admin", "sales_manager"]);

    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const res = await getTeamMetrics({ userId: auth.sub, role: auth.role }, { from, to });
    return ok(res);
  } catch (e) {
    return handleError(e);
  }
}
