import { z } from "zod";

export const RoiAssumptionsSchema = z.object({
  hourlyRate: z.number().min(0).max(500),
  baselineMinutes: z.record(z.string(), z.number().min(0).max(240)),
  autoCheckMinutes: z.number().min(0).max(60),
  defaultReviewMinutes: z.number().min(0).max(120),
  platformMonthlyCost: z.number().min(0).max(100000),
  implementationCost: z.number().min(0).max(1000000),
  /** Realised cost reduction (EUR/month). Only to be entered with evidence. */
  confirmedMonthlySavings: z.number().min(0).max(1000000),
});

export const WorkspaceSettingsSchema = z.object({
  companyName: z.string().min(1).max(120),
  fourEyes: z.boolean(),
  retentionDays: z.number().int().min(7).max(3650),
  /** Delete source files only; extracted metadata and audit log are kept. */
  retentionScope: z.enum(["files", "files_and_text"]),
  roi: RoiAssumptionsSchema,
  /** Synthetic recurring-error history shown on the Exception Radar (demo only). */
  issueHistory: z
    .array(z.object({ partyName: z.string(), code: z.string(), occurrences: z.number(), outOf: z.number(), weeks: z.number() }))
    .default([]),
});

export type RoiAssumptions = z.infer<typeof RoiAssumptionsSchema>;
export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>;
