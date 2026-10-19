/**
 * ROI calculation – deliberately simple and transparent.
 *
 *   Hours before  = documents × manual minutes / 60
 *   Hours after   = (automatable documents × review minutes + remaining documents × manual minutes) / 60
 *   Hours freed   = hours before − hours after
 *   Labour value  = hours freed × fully loaded hourly rate
 *   Net effect    = labour value − platform fee
 *   Payback       = implementation cost / net effect   (only if net effect > 0)
 *
 * Freed working time is NOT the same as a cost reduction. It only turns into saved money if the
 * company actually reduces cost (overtime, temporary staff, avoided hiring). The result therefore
 * separates "freed time", "potential value" and "confirmed cost reduction".
 */

export interface RoiInput {
  documentsPerMonth: number;
  manualMinutesPerDocument: number;
  hourlyRate: number;
  /** Share of documents that can realistically be processed automatically, 0..1. */
  automationRate: number;
  /** Minutes a person still spends checking an automatically processed document. */
  reviewMinutesPerAutomatedDocument: number;
  implementationCost: number;
  platformMonthlyCost: number;
  /** Cost reduction the company has actually realised (EUR/month). 0 unless evidenced. */
  confirmedMonthlySavings?: number;
}

export interface RoiResult {
  hoursBefore: number;
  hoursAfter: number;
  hoursFreed: number;
  /** Monetary value of freed time – a potential, not a realised saving. */
  laborValue: number;
  manualCostBefore: number;
  netMonthlyEffect: number;
  /** Months until the implementation cost is recovered; null if the net effect is not positive. */
  paybackMonths: number | null;
  firstYearNet: number;
  confirmedMonthlySavings: number;
  /** Full-time-equivalent of freed hours, assuming FTE_HOURS_PER_MONTH. */
  fteEquivalent: number;
  isPositive: boolean;
  warnings: RoiWarning[];
}

export type RoiWarning =
  | "REVIEW_NOT_FASTER"
  | "NET_NOT_POSITIVE"
  | "PAYBACK_OVER_24_MONTHS"
  | "HIGH_AUTOMATION_ASSUMPTION"
  | "LOW_VOLUME";

export const FTE_HOURS_PER_MONTH = 160;

export const ROI_LIMITS = {
  documentsPerMonth: { min: 0, max: 200_000 },
  manualMinutesPerDocument: { min: 0, max: 240 },
  hourlyRate: { min: 0, max: 500 },
  automationRate: { min: 0, max: 1 },
  reviewMinutesPerAutomatedDocument: { min: 0, max: 240 },
  implementationCost: { min: 0, max: 1_000_000 },
  platformMonthlyCost: { min: 0, max: 100_000 },
} as const;

export function sanitizeRoiInput(input: RoiInput): RoiInput {
  const clamp = (v: number, k: keyof typeof ROI_LIMITS) => {
    const n = Number.isFinite(v) ? v : 0;
    return Math.min(ROI_LIMITS[k].max, Math.max(ROI_LIMITS[k].min, n));
  };
  return {
    documentsPerMonth: clamp(input.documentsPerMonth, "documentsPerMonth"),
    manualMinutesPerDocument: clamp(input.manualMinutesPerDocument, "manualMinutesPerDocument"),
    hourlyRate: clamp(input.hourlyRate, "hourlyRate"),
    automationRate: clamp(input.automationRate, "automationRate"),
    reviewMinutesPerAutomatedDocument: clamp(input.reviewMinutesPerAutomatedDocument, "reviewMinutesPerAutomatedDocument"),
    implementationCost: clamp(input.implementationCost, "implementationCost"),
    platformMonthlyCost: clamp(input.platformMonthlyCost, "platformMonthlyCost"),
    confirmedMonthlySavings: Math.max(0, Number.isFinite(input.confirmedMonthlySavings ?? 0) ? input.confirmedMonthlySavings ?? 0 : 0),
  };
}

export function calculateRoi(raw: RoiInput): RoiResult {
  const i = sanitizeRoiInput(raw);
  const automated = i.documentsPerMonth * i.automationRate;
  const manual = i.documentsPerMonth - automated;

  const hoursBefore = (i.documentsPerMonth * i.manualMinutesPerDocument) / 60;
  const hoursAfter = (automated * i.reviewMinutesPerAutomatedDocument + manual * i.manualMinutesPerDocument) / 60;
  const hoursFreed = hoursBefore - hoursAfter;
  const laborValue = hoursFreed * i.hourlyRate;
  const netMonthlyEffect = laborValue - i.platformMonthlyCost;
  const isPositive = netMonthlyEffect > 0;
  const paybackMonths = isPositive ? i.implementationCost / netMonthlyEffect : null;

  const warnings: RoiWarning[] = [];
  if (i.reviewMinutesPerAutomatedDocument >= i.manualMinutesPerDocument && i.automationRate > 0) warnings.push("REVIEW_NOT_FASTER");
  if (!isPositive) warnings.push("NET_NOT_POSITIVE");
  if (paybackMonths != null && paybackMonths > 24) warnings.push("PAYBACK_OVER_24_MONTHS");
  if (i.automationRate > 0.8) warnings.push("HIGH_AUTOMATION_ASSUMPTION");
  if (i.documentsPerMonth > 0 && i.documentsPerMonth < 300) warnings.push("LOW_VOLUME");

  return {
    hoursBefore: round1(hoursBefore),
    hoursAfter: round1(hoursAfter),
    hoursFreed: round1(hoursFreed),
    laborValue: round0(laborValue),
    manualCostBefore: round0(hoursBefore * i.hourlyRate),
    netMonthlyEffect: round0(netMonthlyEffect),
    paybackMonths: paybackMonths == null ? null : Math.round(paybackMonths * 10) / 10,
    firstYearNet: round0(netMonthlyEffect * 12 - i.implementationCost),
    confirmedMonthlySavings: round0(i.confirmedMonthlySavings ?? 0),
    fteEquivalent: Math.round((hoursFreed / FTE_HOURS_PER_MONTH) * 100) / 100,
    isPositive,
    warnings,
  };
}

/** Defaults used by the public calculator. They are assumptions and are shown as such. */
export const DEFAULT_ROI_INPUT: RoiInput = {
  documentsPerMonth: 1500,
  manualMinutesPerDocument: 8,
  hourlyRate: 48,
  automationRate: 0.5,
  reviewMinutesPerAutomatedDocument: 1.5,
  implementationCost: 9000,
  platformMonthlyCost: 1290,
  confirmedMonthlySavings: 0,
};

/* ---------- Measured ROI (from processed documents in a workspace) ---------- */

export interface ProcessedRecord {
  docType: string;
  route: "auto" | "review" | "approval" | "ignore";
  /** Measured human handling time in seconds, if available. */
  handlingSeconds: number | null;
}

export interface MeasuredRoiAssumptions {
  baselineMinutes: Record<string, number>;
  autoCheckMinutes: number;
  defaultReviewMinutes: number;
  hourlyRate: number;
}

export interface MeasuredRoi {
  documents: number;
  automated: number;
  humanHandled: number;
  ignored: number;
  baselineHours: number;
  actualHours: number;
  hoursFreed: number;
  laborValue: number;
  measuredShare: number; // share of human-handled docs with measured time
}

export function measureRoi(records: ProcessedRecord[], a: MeasuredRoiAssumptions): MeasuredRoi {
  let baseline = 0;
  let actual = 0;
  let automated = 0;
  let human = 0;
  let ignored = 0;
  let measured = 0;
  for (const r of records) {
    if (r.route === "ignore") {
      ignored++;
      continue;
    }
    baseline += a.baselineMinutes[r.docType] ?? 8;
    if (r.route === "auto") {
      automated++;
      actual += a.autoCheckMinutes;
    } else {
      human++;
      if (r.handlingSeconds != null) {
        measured++;
        actual += Math.min(r.handlingSeconds, 3600) / 60;
      } else {
        actual += a.defaultReviewMinutes;
      }
    }
  }
  const hoursFreed = (baseline - actual) / 60;
  return {
    documents: automated + human,
    automated,
    humanHandled: human,
    ignored,
    baselineHours: round1(baseline / 60),
    actualHours: round1(actual / 60),
    hoursFreed: round1(hoursFreed),
    laborValue: round0(hoursFreed * a.hourlyRate),
    measuredShare: human === 0 ? 0 : measured / human,
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round0(n: number) {
  return Math.round(n);
}
