import { z } from "zod";

export const contactCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().optional(),
  position: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  clientCompanyId: z.number().int().positive(),
  salesManagerId: z.number().int().positive(),
  freelanceConsultantId: z.number().int().positive(),
});

export const contactUpdateSchema = contactCreateSchema.partial();
