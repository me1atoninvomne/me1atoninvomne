import { describe, expect, it } from "vitest";
import { parseConsent, serializeConsent, STORAGE_INVENTORY } from "@/legal/cookies";
import { LEGAL_VERSIONS } from "@/legal/versions";
import { addOneMonth, consentText, hashToken } from "@/server/services/privacy";

describe("cookie consent value", () => {
  const c = { v: LEGAL_VERSIONS.consent, id: "cc_abc123", at: "2026-10-20T08:00:00.000Z", comfort: true };

  it("round-trips, also when URL-encoded by the cookie layer", () => {
    expect(parseConsent(serializeConsent(c), LEGAL_VERSIONS.consent)).toEqual(c);
    expect(parseConsent(encodeURIComponent(serializeConsent(c)), LEGAL_VERSIONS.consent)).toEqual(c);
  });

  it("is invalid for another version, so visitors are asked again after a text change", () => {
    expect(parseConsent(serializeConsent(c), "1999-01-01")).toBeNull();
  });

  it("rejects malformed values", () => {
    for (const raw of ["", "garbage", `${LEGAL_VERSIONS.consent}~id~not-a-date~1`, `${LEGAL_VERSIONS.consent}~id~2026-10-20T08:00:00Z~yes`]) {
      expect(parseConsent(raw, LEGAL_VERSIONS.consent)).toBeNull();
    }
  });
});

describe("storage inventory", () => {
  it("documents every cookie the server sets", () => {
    const names = STORAGE_INVENTORY.map((e) => e.name);
    for (const n of ["fp_consent", "fp_lang", "fp_ws", "fp_user"]) expect(names).toContain(n);
  });

  it("only uses first-party necessary or comfort categories – no analytics or marketing", () => {
    expect(new Set(STORAGE_INVENTORY.map((e) => e.category))).toEqual(new Set(["necessary", "comfort"]));
  });
});

describe("data-subject requests", () => {
  it("deadline is one calendar month (Art. 12(3) GDPR), clamped at month end", () => {
    expect(addOneMonth("2026-10-20T10:00:00.000Z")).toBe("2026-11-20T10:00:00.000Z");
    expect(addOneMonth("2026-01-31T10:00:00.000Z")).toBe("2026-02-28T10:00:00.000Z");
    expect(addOneMonth("2026-12-15T00:00:00.000Z")).toBe("2027-01-15T00:00:00.000Z");
  });

  it("stores only a hash of the personal link token", () => {
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("abc")).not.toContain("abc");
  });

  it("keeps the exact consent wording per language as proof", () => {
    expect(consentText("marketing_email", "de")).toMatch(/höchstens monatlich/);
    expect(consentText("marketing_email", "en")).toMatch(/at most monthly/);
    expect(consentText("age_b2b", "de", "demo_start")).toMatch(/Demo/);
  });
});
