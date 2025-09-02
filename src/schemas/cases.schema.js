import { z } from "zod";
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "invalid id");

export const createCaseSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(5000).optional(),
  status: z.enum(["open","cold","closed"]).optional().default("open"),
  priority: z.coerce.number().int().min(1).max(5).optional().default(3),
  suspects: z.array(objectId).optional().default([]),
  evidence: z.array(objectId).optional().default([]),
});
