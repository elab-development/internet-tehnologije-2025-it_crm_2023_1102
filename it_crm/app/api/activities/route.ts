import { NextResponse, type NextRequest } from "next/server";
import { handleError, ok } from "@/src/server/http/response";
import { requireAuth } from "@/src/server/auth/requireAuth";
import { activityCreateSchema } from "@/src/server/validators/activity";
import { createActivity, listActivities } from "@/src/server/services/activityService";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") ?? undefined;
    const entityId = searchParams.get("entityId") ? Number(searchParams.get("entityId")) : undefined;

    const res = await listActivities(
      { userId: auth.sub, role: auth.role },
      { entityType: entityType as any, entityId }
    );

    return ok(res);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();

    const body = await req.json();
    const parsed = activityCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Validacija nije prošla." }, { status: 422 });
    }

    const created = await createActivity({ userId: auth.sub, role: auth.role }, parsed.data);
    return ok(created, 201);
  } catch (e) {
    return handleError(e);
  }
}
