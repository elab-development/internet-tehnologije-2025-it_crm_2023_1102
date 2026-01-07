import { z } from "zod";

export const activityCreateSchema = z.object({
  entityType: z.enum(["clientCompany", "opportunity"]),
  entityId: z.number().int().positive(),
  type: z.enum(["note", "call", "meeting"]),
  description: z.string().trim().min(2).max(1000),
});
