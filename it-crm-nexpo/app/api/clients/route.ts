import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { getAuthUser, hasRole } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import {
  clients,
  interactions,
  projectRequests,
  users,
} from "@/db/schema";

// Svi ulogovani korisnici mogu da vide klijente.
export async function GET(request: NextRequest) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const allClients = await db.query.clients.findMany({
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
    orderBy: [desc(clients.createdAt)],
  });

  return successResponse(allClients, "Clients loaded successfully");
}

// Samo admin i sales manager mogu da kreiraju klijente.
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

    const { name, email, company, status } = body;

    if (!name || !email || !company) {
      return errorResponse("Name, email and company are required", 400);
    }

    const [client] = await db
      .insert(clients)
      .values({
        name,
        email,
        company,
        status: status || "lead",
        userId: user.id,
        updatedAt: new Date(),
      })
      .returning();

    return successResponse(client, "Client created successfully", 201);
  } catch {
    return errorResponse("Client creation failed", 500);
  }
}