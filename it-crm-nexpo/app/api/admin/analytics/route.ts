import { NextRequest } from "next/server";
import { count } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { getAuthUser, hasRole } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import {
  clients,
  interactions,
  offers,
  projectRequests,
  users,
} from "@/db/schema";

// Admin ruta koja vraća analitiku za grafikone.
export async function GET(request: NextRequest) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  if (!hasRole(user, ["admin"])) {
    return errorResponse("Forbidden", 403);
  }

  const [usersResult] = await db.select({ value: count() }).from(users);
  const [clientsResult] = await db.select({ value: count() }).from(clients);
  const [projectRequestsResult] = await db
    .select({ value: count() })
    .from(projectRequests);
  const [offersResult] = await db.select({ value: count() }).from(offers);
  const [interactionsResult] = await db
    .select({ value: count() })
    .from(interactions);

  const usersByRole = await db
    .select({
      name: users.role,
      value: count(),
    })
    .from(users)
    .groupBy(users.role);

  const requestsByStatus = await db
    .select({
      name: projectRequests.status,
      value: count(),
    })
    .from(projectRequests)
    .groupBy(projectRequests.status);

  const offersByStatus = await db
    .select({
      name: offers.status,
      value: count(),
    })
    .from(offers)
    .groupBy(offers.status);

  return successResponse(
    {
      totals: {
        usersCount: usersResult.value,
        clientsCount: clientsResult.value,
        projectRequestsCount: projectRequestsResult.value,
        offersCount: offersResult.value,
        interactionsCount: interactionsResult.value,
      },
      usersByRole,
      requestsByStatus,
      offersByStatus,
    },
    "Admin analytics loaded successfully"
  );
}