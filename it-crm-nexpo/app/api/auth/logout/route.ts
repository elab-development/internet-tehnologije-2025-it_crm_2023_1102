import { NextResponse } from "next/server";

// Odjavljuje korisnika brisanjem token cookie-ja.
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logout successful",
    data: null,
  });

  response.cookies.set("token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });

  return response;
}