import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/helpers/db";
import { errorResponse, successResponse } from "@/lib/helpers/response";
import { users } from "@/db/schema";

// Registruje novog korisnika u sistem.
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return errorResponse("Name, email and password are required", 400);
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return errorResponse("User with this email already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        role: role || "it_consultant",
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      });

    return successResponse(newUser, "User registered successfully", 201);
  } catch {
    return errorResponse("Registration failed", 500);
  }
}