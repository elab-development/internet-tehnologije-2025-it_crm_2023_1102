import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { createToken } from "@/lib/helpers/auth";
import { errorResponse } from "@/lib/helpers/response";
import { users } from "@/db/schema";

// Prijavljuje korisnika i vraća njegovu ulogu.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("Email and password are required", 400);
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return errorResponse("Invalid email or password", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return errorResponse("Invalid email or password", 401);
    }

    if (user.status === "inactive") {
      return errorResponse("User account is inactive", 403);
    }

    const token = createToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return errorResponse("Login failed", 500);
  }
}