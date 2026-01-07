import { z } from "zod";

export const clientCompanyCreateSchema = z.object({
  name: z.string().trim().min(2, "Naziv je obavezan.").max(200),
  industry: z.string().trim().min(1, "Industrija je obavezna."),
  companySize: z.string().trim().min(1, "Veličina kompanije je obavezna."),
  website: z.string().trim().url("Website nije validan.").optional(),
  country: z.string().trim().min(1),
  city: z.string().trim().min(1),
  address: z.string().trim().min(1),
  status: z.string().trim().min(1),
  categoryId: z.number().int().positive(),
  salesManagerId: z.number().int().positive(),
  freelanceConsultantId: z.number().int().positive(),
});

export const clientCompanyUpdateSchema = clientCompanyCreateSchema.partial();
