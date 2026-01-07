import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Ime mora imati najmanje 2 karaktera.").max(100, "Ime je predugačko."),
  email: z.string().trim().toLowerCase().email("Email nije validan."),
  password: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera.").max(200, "Lozinka je predugačka."),
  role: z.enum(["admin", "sales_manager", "freelance_consultant"]),
  // Za freelance_consultant mora da se pošalje managerId.
  managerId: z.number().int().positive().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email nije validan."),
  password: z.string().min(1, "Lozinka je obavezna."),
});
