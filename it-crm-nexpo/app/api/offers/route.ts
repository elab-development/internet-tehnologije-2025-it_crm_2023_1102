import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { getAuthUser, hasRole } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import { offers } from "@/db/schema";

// Samo admin i sales manager mogu da vide ponude.
export async function GET(request: NextRequest) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  if (!hasRole(user, ["admin", "sales_manager"])) {
    return errorResponse("Forbidden", 403);
  }

  const allOffers = await db.query.offers.findMany({
    with: {
      projectRequest: {
        with: {
          client: true,
        },
      },
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: [desc(offers.createdAt)],
  });

  return successResponse(allOffers, "Offers loaded successfully");
}

// Samo admin i sales manager mogu da kreiraju ponude.
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

    const { price, status, projectRequestId } = body;

    if (!price || !projectRequestId) {
      return errorResponse("Price and project request are required", 400);
    }

    const [offer] = await db
      .insert(offers)
      .values({
        price: String(price),
        status: status || "draft",
        projectRequestId: Number(projectRequestId),
        userId: user.id,
        updatedAt: new Date(),
      })
      .returning();

    return successResponse(offer, "Offer created successfully", 201);
  } catch {
    return errorResponse("Offer creation failed", 500);
  }
}