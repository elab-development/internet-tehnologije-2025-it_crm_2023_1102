import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { getAuthUser, hasRole } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import { projectRequests } from "@/db/schema";

// Svi ulogovani korisnici mogu da vide jedan projektni zahtev.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await context.params;

  const projectRequest = await db.query.projectRequests.findFirst({
    where: eq(projectRequests.id, Number(id)),
    with: {
      client: true,
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      offers: true,
    },
  });

  if (!projectRequest) {
    return errorResponse("Project request not found", 404);
  }

  return successResponse(projectRequest, "Project request loaded successfully");
}

// Samo admin i sales manager mogu da menjaju projektne zahteve.
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  if (!hasRole(user, ["admin", "sales_manager"])) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    const { title, description, status, clientId } = body;

    const [projectRequest] = await db
      .update(projectRequests)
      .set({
        title,
        description,
        status,
        clientId: clientId ? Number(clientId) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(projectRequests.id, Number(id)))
      .returning();

    if (!projectRequest) {
      return errorResponse("Project request not found", 404);
    }

    return successResponse(
      projectRequest,
      "Project request updated successfully"
    );
  } catch {
    return errorResponse("Project request update failed", 500);
  }
}

// Samo admin i sales manager mogu da brišu projektne zahteve.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  if (!hasRole(user, ["admin", "sales_manager"])) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const { id } = await context.params;

    await db
      .delete(projectRequests)
      .where(eq(projectRequests.id, Number(id)));

    return successResponse(null, "Project request deleted successfully");
  } catch {
    return errorResponse(
      "Project request delete failed because request has related offers",
      500
    );
  }
}