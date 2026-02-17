import { NextRequest, NextResponse } from "next/server";

const allowedOrigins = [
  "http://localhost:3000"
];

const corsOptions = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const isAllowedOrigin = allowedOrigins.includes(origin);

  // Preflight.
  if (request.method === "OPTIONS") {
    const preflightHeaders: Record<string, string> = {
      ...(isAllowedOrigin ? { "Access-Control-Allow-Origin": origin } : {}),
      ...corsOptions,
      // Dobar običaj (neophodno kada vary po origin-u).
      "Vary": "Origin",
    };

    return NextResponse.json({}, { headers: preflightHeaders });
  }

  // “Simple” request.
  const response = NextResponse.next();

  if (isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }

  Object.entries(corsOptions).forEach(([k, v]) => response.headers.set(k, v));

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
