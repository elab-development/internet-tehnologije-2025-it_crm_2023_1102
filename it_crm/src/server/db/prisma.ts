import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 * Bitno u Next.js da se ne kreira nova konekcija na svaki hot reload.
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
