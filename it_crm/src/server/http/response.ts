import { NextResponse } from "next/server";

/**
 * Standardizovani API odgovori.
 * Nonfunctional zahtev: server greške ne otkrivaju detalje.
 */

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export function handleError(e: unknown) {
  const anyErr = e as any;
  const status = anyErr?.status ?? 500;

  // 500: uvek generična poruka.
  if (status === 500) return fail("Greška na serveru.", 500);

  // Standardizovane poruke.
  if (status === 401) return fail("Nije autentifikovan.", 401);
  if (status === 403) return fail("Zabranjeno.", 403);

  return fail(anyErr?.message || "Greška.", status);
}
