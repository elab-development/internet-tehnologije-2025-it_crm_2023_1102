import { NextRequest } from "next/server";
import { count } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { getAuthUser } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import {
  clients,
  interactions,
  offers,
  projectRequests,
} from "@/db/schema";

// Vraća osnovne metrike za dashboard.
export async function GET(request: NextRequest) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const [clientsResult] = await db.select({ value: count() }).from(clients);

  const [projectRequestsResult] = await db
    .select({ value: count() })
    .from(projectRequests);

  const [offersResult] = await db.select({ value: count() }).from(offers);

  const [interactionsResult] = await db
    .select({ value: count() })
    .from(interactions);

  return successResponse(
    {
      clientsCount: clientsResult.value,
      projectRequestsCount: projectRequestsResult.value,
      offersCount: offersResult.value,
      interactionsCount: interactionsResult.value,
    },
    "Dashboard metrics loaded successfully"
  );
}