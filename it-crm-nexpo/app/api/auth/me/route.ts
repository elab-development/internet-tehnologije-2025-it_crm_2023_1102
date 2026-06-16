import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/helpers/auth";
import { errorResponse, successResponse } from "@/lib/helpers/response";

// Vraća trenutno ulogovanog korisnika.
export async function GET(request: NextRequest) {
  const user = getAuthUser(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  return successResponse(user, "Current user loaded");
}