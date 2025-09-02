import { z } from "zod";

export const createCriminalSchema = z.object({
  name: z.string().trim().min(1, "name required").max(120),
  aliases: z.array(z.string().trim().max(120)).optional().default([]),
  crimes: z.array(z.string().trim().max(200)).optional().default([]),
  status: z.enum(["free", "captured", "unknown"]).optional().default("unknown"),
  threatLevel: z.coerce.number().int().min(1).max(5).optional().default(3),
  lastSeen: z.coerce.date().optional(), // accepts ISO string → Date
  notes: z.string().trim().max(5000).optional(),
});

export const listCriminalsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  q: z.string().optional().default(""),
  status: z.enum(["free", "captured", "unknown"]).optional(),
  minThreat: z.coerce.number().int().min(1).max(5).optional(),
  maxThreat: z.coerce.number().int().min(1).max(5).optional(),
  sort: z.string().optional().default("-createdAt"),
});
