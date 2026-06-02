import { NextResponse } from "next/server";

// Helper funkcija za uspešan JSON odgovor.
export function successResponse(
  data: unknown,
  message = "Success",
  status = 200
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

// Helper funkcija za JSON odgovor sa greškom.
export function errorResponse(
  message = "Something went wrong",
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}