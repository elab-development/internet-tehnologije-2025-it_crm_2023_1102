import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { getAuthUser, hasRole } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import { users } from "@/db/schema";

// Admin menja ulogu i status korisnika.
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  if (!hasRole(user, ["admin"])) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    const [updatedUser] = await db
      .update(users)
      .set({
        role: body.role,
        status: body.status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, Number(id)))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      });

    if (!updatedUser) {
      return errorResponse("User not found", 404);
    }

    return successResponse(updatedUser, "User updated successfully");
  } catch {
    return errorResponse("User update failed", 500);
  }
}

// Admin briše korisnika.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  if (!hasRole(user, ["admin"])) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const { id } = await context.params;

    await db.delete(users).where(eq(users.id, Number(id)));

    return successResponse(null, "User deleted successfully");
  } catch {
    return errorResponse(
      "User delete failed because user has related records",
      500
    );
  }
}