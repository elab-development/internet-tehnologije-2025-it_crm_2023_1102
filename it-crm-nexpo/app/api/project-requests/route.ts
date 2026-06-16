import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { getAuthUser, hasRole } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import { projectRequests } from "@/db/schema";

// Svi ulogovani korisnici mogu da vide projektne zahteve.
export async function GET(request: NextRequest) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const allProjectRequests = await db.query.projectRequests.findMany({
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
    orderBy: [desc(projectRequests.createdAt)],
  });

  return successResponse(
    allProjectRequests,
    "Project requests loaded successfully"
  );
}

// Samo admin i sales manager mogu da kreiraju projektne zahteve.
export async function POST(request: NextRequest) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  if (!hasRole(user, ["admin", "sales_manager"])) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const body = await request.json();

    const { title, description, status, clientId } = body;

    if (!title || !description || !clientId) {
      return errorResponse("Title, description and client are required", 400);
    }

    const [projectRequest] = await db
      .insert(projectRequests)
      .values({
        title,
        description,
        status: status || "new",
        clientId: Number(clientId),
        userId: user.id,
        updatedAt: new Date(),
      })
      .returning();

    return successResponse(
      projectRequest,
      "Project request created successfully",
      201
    );
  } catch {
    return errorResponse("Project request creation failed", 500);
  }
}