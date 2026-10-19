import { describe, expect, it } from "vitest";
import { calculateRoi, measureRoi } from "@/domain/roi";

const base = {
  documentsPerMonth: 1000,
  manualMinutesPerDocument: 6,
  hourlyRate: 50,
  automationRate: 0.5,
  reviewMinutesPerAutomatedDocument: 1,
  implementationCost: 6000,
  platformMonthlyCost: 1000,
};

describe("calculateRoi", () => {
  it("applies the documented formulas", () => {
    const r = calculateRoi(base);
    // before: 1000 × 6 / 60 = 100 h; after: (500 × 1 + 500 × 6) / 60 = 58.3 h
    expect(r.hoursBefore).toBe(100);
    expect(r.hoursAfter).toBe(58.3);
    expect(r.hoursFreed).toBe(41.7);
    expect(r.laborValue).toBe(2083); // 41.67 h × 50 €
    expect(r.netMonthlyEffect).toBe(1083);
    expect(r.paybackMonths).toBe(5.5); // 6000 / 1083.3
    expect(r.isPositive).toBe(true);
  });

  it("reports honestly when the effect is not positive", () => {
    const r = calculateRoi({ ...base, documentsPerMonth: 100 });
    expect(r.isPositive).toBe(false);
    expect(r.paybackMonths).toBeNull();
    expect(r.warnings).toContain("NET_NOT_POSITIVE");
    expect(r.warnings).toContain("LOW_VOLUME");
  });

  it("flags when review takes as long as manual work", () => {
    const r = calculateRoi({ ...base, reviewMinutesPerAutomatedDocument: 6 });
    expect(r.hoursFreed).toBe(0);
    expect(r.warnings).toContain("REVIEW_NOT_FASTER");
  });

  it("clamps invalid input instead of producing NaN", () => {
    const r = calculateRoi({ ...base, automationRate: 4, hourlyRate: Number.NaN, documentsPerMonth: -5 });
    expect(Number.isFinite(r.netMonthlyEffect)).toBe(true);
    expect(r.hoursBefore).toBe(0);
  });

  it("never mixes confirmed savings into the potential", () => {
    const r = calculateRoi({ ...base, confirmedMonthlySavings: 400 });
    expect(r.confirmedMonthlySavings).toBe(400);
    expect(r.netMonthlyEffect).toBe(1083);
  });
});

describe("measureRoi", () => {
  it("uses measured handling time where available and ignores non-business mail", () => {
    const m = measureRoi(
      [
        { docType: "purchase_order", route: "auto", handlingSeconds: null },
        { docType: "purchase_order", route: "review", handlingSeconds: 180 },
        { docType: "invoice", route: "approval", handlingSeconds: null },
        { docType: "other", route: "ignore", handlingSeconds: null },
      ],
      { baselineMinutes: { purchase_order: 12, invoice: 8 }, autoCheckMinutes: 0.5, defaultReviewMinutes: 3, hourlyRate: 60 },
    );
    expect(m.documents).toBe(3);
    expect(m.ignored).toBe(1);
    expect(m.automated).toBe(1);
    // baseline 32 min, actual 0.5 + 3 + 3 = 6.5 min → 25.5 min freed
    expect(m.hoursFreed).toBe(0.4);
    expect(m.measuredShare).toBe(0.5);
  });
});
