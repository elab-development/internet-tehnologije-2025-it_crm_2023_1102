import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { getAuthUser } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import { interactions } from "@/db/schema";

// Svi ulogovani korisnici mogu da vide jednu interakciju.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await context.params;

  const interaction = await db.query.interactions.findFirst({
    where: eq(interactions.id, Number(id)),
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
    },
  });

  if (!interaction) {
    return errorResponse("Interaction not found", 404);
  }

  return successResponse(interaction, "Interaction loaded successfully");
}

// Svi ulogovani korisnici mogu da menjaju interakcije.
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    const { type, summary, clientId } = body;

    const [interaction] = await db
      .update(interactions)
      .set({
        type,
        summary,
        clientId: clientId ? Number(clientId) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(interactions.id, Number(id)))
      .returning();

    if (!interaction) {
      return errorResponse("Interaction not found", 404);
    }

    return successResponse(interaction, "Interaction updated successfully");
  } catch {
    return errorResponse("Interaction update failed", 500);
  }
}

// Svi ulogovani korisnici mogu da brišu interakcije.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await context.params;

    await db.delete(interactions).where(eq(interactions.id, Number(id)));

    return successResponse(null, "Interaction deleted successfully");
  } catch {
    return errorResponse("Interaction delete failed", 500);
  }
}