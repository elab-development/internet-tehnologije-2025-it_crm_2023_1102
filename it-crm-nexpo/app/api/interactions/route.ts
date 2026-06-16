import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { getAuthUser } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import { interactions } from "@/db/schema";

// Svi ulogovani korisnici mogu da vide interakcije.
export async function GET(request: NextRequest) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const allInteractions = await db.query.interactions.findMany({
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
    orderBy: [desc(interactions.createdAt)],
  });

  return successResponse(allInteractions, "Interactions loaded successfully");
}

// Svi ulogovani korisnici mogu da kreiraju interakcije.
export async function POST(request: NextRequest) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await request.json();

    const { type, summary, clientId } = body;

    if (!type || !summary || !clientId) {
      return errorResponse("Type, summary and client are required", 400);
    }

    const [interaction] = await db
      .insert(interactions)
      .values({
        type,
        summary,
        clientId: Number(clientId),
        userId: user.id,
        updatedAt: new Date(),
      })
      .returning();

    return successResponse(
      interaction,
      "Interaction created successfully",
      201
    );
  } catch {
    return errorResponse("Interaction creation failed", 500);
  }
}