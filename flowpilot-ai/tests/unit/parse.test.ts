import { describe, expect, it } from "vitest";
import {
  isValidIban,
  isoWeekMonday,
  nameSimilarity,
  parseCalendarWeek,
  parseGermanDate,
  parseGermanNumber,
} from "@/domain/parse";

describe("German number parsing", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["1234,56", 1234.56],
    ["12.500", 12500],
    ["1.000", 1000],
    ["0,75", 0.75],
    ["8.377,60 EUR", 8377.6],
    ["€ 12,00", 12],
    ["1234.50", 1234.5],
  ])("%s → %d", (input, expected) => {
    expect(parseGermanNumber(input)).toBe(expected);
  });

  it("rejects text", () => {
    expect(parseGermanNumber("unbekannt")).toBeNull();
    expect(parseGermanNumber("")).toBeNull();
  });
});

describe("dates", () => {
  it("parses dd.mm.yyyy and rejects impossible dates", () => {
    expect(parseGermanDate("05.11.2026")).toBe("2026-11-05");
    expect(parseGermanDate("5.1.26")).toBe("2026-01-05");
    expect(parseGermanDate("31.02.2026")).toBeNull();
  });

  it("resolves calendar weeks to the ISO Monday", () => {
    expect(parseCalendarWeek("KW 47/2026")).toBe("2026-11-16");
    expect(parseCalendarWeek("Kalenderwoche 1/2027")).toBe(isoWeekMonday(2027, 1));
    expect(isoWeekMonday(2027, 1)).toBe("2027-01-04");
  });
});

describe("IBAN", () => {
  it("validates the mod-97 checksum", () => {
    expect(isValidIban("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(isValidIban("DE89 3704 0044 0532 0130 01")).toBe(false);
    expect(isValidIban("DE8937040044")).toBe(false);
  });
});

describe("company names", () => {
  it("ignores legal forms and umlaut spelling", () => {
    expect(nameSimilarity("Nordlicht Fördertechnik GmbH & Co. KG", "Nordlicht Foerdertechnik")).toBe(1);
    expect(nameSimilarity("Beispiel Maschinenbau GmbH", "Weber & Söhne Agrartechnik GmbH")).toBeLessThan(0.5);
  });
});
