/**
 * Centralizovane greške.
 * Nonfunctional zahtev: korisnik ne sme da vidi interne detalje implementacije.
 */

export class AppError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Nije autentifikovan.") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Zabranjeno.") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Nije pronađeno.") {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validacija nije prošla.") {
    super(message, 422);
  }
}
