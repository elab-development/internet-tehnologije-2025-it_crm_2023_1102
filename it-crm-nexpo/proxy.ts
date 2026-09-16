import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Dozvoljeni origin-i za lokalni razvoj i potencijalni frontend domen.
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.NEXT_PUBLIC_APP_URL || "",
].filter(Boolean);

// CORS podešavanja koja važe za API rute.
const corsOptions = {
  methods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  headers: "Content-Type, Authorization",
  credentials: "true",
};

// Pronalazi origin koji je dozvoljen.
function getAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }

  return "http://localhost:3000";
}

// Dodaje CORS headere na response.
function addCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", corsOptions.methods);
  response.headers.set("Access-Control-Allow-Headers", corsOptions.headers);
  response.headers.set("Access-Control-Allow-Credentials", corsOptions.credentials);
  response.headers.set("Vary", "Origin");

  return response;
}

// Proxy funkcija koja obrađuje CORS za API rute.
export function proxy(request: NextRequest) {
  const origin = getAllowedOrigin(request);

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, {
      status: 204,
    });

    return addCorsHeaders(response, origin);
  }

  const response = NextResponse.next();

  return addCorsHeaders(response, origin);
}

// Proxy se primenjuje samo na API rute.
export const config = {
  matcher: ["/api/:path*"],
};