import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { getAuthUser, hasRole } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import { offers } from "@/db/schema";

// Samo admin i sales manager mogu da vide jednu ponudu.
export async function GET(
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

  const { id } = await context.params;

  const offer = await db.query.offers.findFirst({
    where: eq(offers.id, Number(id)),
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
  });

  if (!offer) {
    return errorResponse("Offer not found", 404);
  }

  return successResponse(offer, "Offer loaded successfully");
}

// Samo admin i sales manager mogu da menjaju ponude.
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

    const { price, status, projectRequestId } = body;

    const [offer] = await db
      .update(offers)
      .set({
        price: price ? String(price) : undefined,
        status,
        projectRequestId: projectRequestId ? Number(projectRequestId) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(offers.id, Number(id)))
      .returning();

    if (!offer) {
      return errorResponse("Offer not found", 404);
    }

    return successResponse(offer, "Offer updated successfully");
  } catch {
    return errorResponse("Offer update failed", 500);
  }
}

// Samo admin i sales manager mogu da brišu ponude.
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

    await db.delete(offers).where(eq(offers.id, Number(id)));

    return successResponse(null, "Offer deleted successfully");
  } catch {
    return errorResponse("Offer delete failed", 500);
  }
}