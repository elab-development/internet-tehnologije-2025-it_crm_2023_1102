import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { getAuthUser, hasRole } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import { clients } from "@/db/schema";

// Svi ulogovani korisnici mogu da vide jednog klijenta.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await context.params;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, Number(id)),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      projectRequests: true,
      interactions: true,
    },
  });

  if (!client) {
    return errorResponse("Client not found", 404);
  }

  return successResponse(client, "Client loaded successfully");
}

// Samo admin i sales manager mogu da menjaju klijente.
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

    const { name, email, company, status } = body;

    const [client] = await db
      .update(clients)
      .set({
        name,
        email,
        company,
        status,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, Number(id)))
      .returning();

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    return successResponse(client, "Client updated successfully");
  } catch {
    return errorResponse("Client update failed", 500);
  }
}

// Samo admin i sales manager mogu da brišu klijente.
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

    await db.delete(clients).where(eq(clients.id, Number(id)));

    return successResponse(null, "Client deleted successfully");
  } catch {
    return errorResponse(
      "Client delete failed because client has related records",
      500
    );
  }
}