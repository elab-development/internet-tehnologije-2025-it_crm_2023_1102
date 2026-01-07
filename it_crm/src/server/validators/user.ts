import { z } from "zod";

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.enum(["admin", "sales_manager", "freelance_consultant"]).optional(),
  isActive: z.boolean().optional(),
  managerId: z.number().int().positive().optional(),
});

export const userListQuerySchema = z.object({
  q: z.string().trim().optional(),
  role: z.enum(["admin", "sales_manager", "freelance_consultant"]).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
