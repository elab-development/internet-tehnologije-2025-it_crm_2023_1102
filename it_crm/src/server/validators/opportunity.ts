import { z } from "zod";

export const opportunityCreateSchema = z.object({
  title: z.string().trim().min(2, "Naslov je obavezan.").max(200),
  description: z.string().trim().max(2000).optional(),
  stage: z.string().trim().min(1),
  status: z.string().trim().min(1),
  estimatedValue: z.number().nonnegative("Procenjena vrednost ne može biti negativna."),
  currency: z.string().trim().min(1),
  probability: z.number().min(0, "Verovatnoća ne može biti negativna.").max(1, "Verovatnoća mora biti ≤ 1."),
  expectedCloseDate: z.string().datetime().optional(),
  contactId: z.number().int().positive(),
  salesManagerId: z.number().int().positive(),
  freelanceConsultantId: z.number().int().positive(),
  clientCompanyId: z.number().int().positive().optional(),
});

export const opportunityUpdateSchema = opportunityCreateSchema.partial();
