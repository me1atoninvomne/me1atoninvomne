/**
 * Synthetic master data for the demo ERP. All companies, people, addresses, phone numbers and
 * bank details are fictional. Bank codes starting with 9 do not exist in Germany; phone numbers
 * use ranges reserved for fictional use. E-mail domains use the reserved `.example` TLD.
 */
import { addDays } from "@/domain/parse";
import type { MasterData } from "@/domain/types";

export const OWN_COMPANY = {
  name: "Muster Antriebstechnik GmbH",
  street: "Gewerbering 14",
  zip: "73037",
  city: "Göppingen",
  vatId: "DE123456789",
  email: "auftrag@muster-antriebstechnik.example",
};

export const IBANS = {
  stahlhandel: "DE89370400440532013000",
  kugellager: "DE63900100200004471100",
  elektro: "DE70900200300008833200",
  elektroFraud: "DE64900900100012349876",
  spedition: "DE05900300400005566770",
};

export function buildMasterData(today: string): MasterData {
  const d = (n: number) => addDays(today, n);
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const yearEnd = `${today.slice(0, 4)}-12-31`;
  return {
    customers: [
      {
        number: "K-10023",
        name: "Beispiel Maschinenbau GmbH",
        address: { street: "Industriestraße 12", zip: "33602", city: "Bielefeld" },
        paymentTerms: "30 Tage netto",
      },
      {
        number: "K-10047",
        name: "Nordlicht Fördertechnik GmbH & Co. KG",
        aliases: ["Nordlicht Foerdertechnik"],
        address: { street: "Hafenweg 8", zip: "28217", city: "Bremen" },
        paymentTerms: "14 Tage 2 % Skonto, 30 Tage netto",
      },
      {
        number: "K-10088",
        name: "Alpenblick Verpackungssysteme AG",
        aliases: ["Alpenblick Verpackung"],
        address: { street: "Gewerbepark 3", zip: "87435", city: "Kempten" },
        paymentTerms: "30 Tage netto",
      },
      {
        number: "K-10112",
        name: "Rheinauen Anlagenbau GmbH",
        address: { street: "Am Rheinufer 21", zip: "47051", city: "Duisburg" },
        paymentTerms: "45 Tage netto",
      },
    ],
    suppliers: [
      {
        number: "L-20011",
        name: "Stahlhandel Muster KG",
        address: { street: "Rheinstahlstraße 40", zip: "50769", city: "Köln" },
        iban: IBANS.stahlhandel,
        phone: "+49 221 4710 140",
      },
      {
        number: "L-20034",
        name: "Kugellager Beispiel GmbH",
        address: { street: "Lagerstraße 7", zip: "81379", city: "München" },
        iban: IBANS.kugellager,
        phone: "+49 89 99998 207",
      },
      {
        number: "L-20078",
        name: "Elektro Komponenten Muster GmbH",
        address: { street: "Schaltweg 3", zip: "22525", city: "Hamburg" },
        iban: IBANS.elektro,
        phone: "+49 40 66969 330",
      },
      {
        number: "L-20056",
        name: "Spedition Testmann GmbH",
        address: { street: "Frachtring 12", zip: "60549", city: "Frankfurt am Main" },
        iban: IBANS.spedition,
        phone: "+49 69 90009 450",
      },
    ],
    articles: [
      { number: "AT-4711", description: "Stirnradgetriebe SG-40, i=10", unit: "Stk", listPrice: 459.0 },
      { number: "AT-2210", description: "Elastische Kupplung EK-28", unit: "Stk", listPrice: 64.9 },
      {
        number: "AT-3305",
        description: "Rillenkugellager 6205-2RS",
        unit: "Stk",
        listPrice: 5.2,
        purchasePrice: 3.85,
        supplierNumbers: { "L-20034": "KB-6205-2RS" },
      },
      { number: "AT-5120", description: "Antriebswelle Ø 40 x 600 mm", unit: "Stk", listPrice: 129.0 },
      { number: "AT-6001", description: "Getriebemotor GM-075, 0,75 kW", unit: "Stk", listPrice: 612.0 },
      {
        number: "AT-7302",
        description: "Flanschlager FL-30",
        unit: "Stk",
        listPrice: 38.4,
        purchasePrice: 22.1,
        supplierNumbers: { "L-20034": "KB-FL30" },
      },
      { number: "AT-8105", description: "Zahnriemen HTD 8M-1200", unit: "Stk", listPrice: 27.8 },
      { number: "AT-9010", description: "Wartungsset Getriebe SG-40", unit: "Set", listPrice: 89.0 },
      {
        number: "RM-1040",
        description: "Rundstahl C45 Ø 45 mm",
        unit: "m",
        listPrice: 0,
        purchasePrice: 14.2,
        supplierNumbers: { "L-20011": "C45-RD45" },
      },
      {
        number: "RM-1060",
        description: "Flachstahl S235 60 x 10 mm",
        unit: "m",
        listPrice: 0,
        purchasePrice: 6.85,
        supplierNumbers: { "L-20011": "S235-FL6010" },
      },
      {
        number: "EL-3020",
        description: "Frequenzumrichter FU-075",
        unit: "Stk",
        listPrice: 0,
        purchasePrice: 248.0,
        supplierNumbers: { "L-20078": "EKM-FU075" },
      },
      {
        number: "EL-3045",
        description: "Motorschutzschalter MS-25",
        unit: "Stk",
        listPrice: 0,
        purchasePrice: 41.6,
        supplierNumbers: { "L-20078": "EKM-MS25" },
      },
      {
        number: "LG-1001",
        description: "Stückgut national je Palette",
        unit: "Pal",
        listPrice: 0,
        purchasePrice: 58.0,
        supplierNumbers: { "L-20056": "STG-PAL" },
      },
      {
        number: "LG-1002",
        description: "Avis / Terminzustellung",
        unit: "Stk",
        listPrice: 0,
        purchasePrice: 15.0,
        supplierNumbers: { "L-20056": "STG-AVIS" },
      },
    ],
    agreedPrices: [
      { partyNumber: "K-10023", articleNumber: "AT-4711", price: 445.0, validFrom: yearStart, validTo: yearEnd },
      { partyNumber: "K-10023", articleNumber: "AT-2210", price: 61.5, validFrom: yearStart, validTo: yearEnd },
      { partyNumber: "K-10023", articleNumber: "AT-5120", price: 124.0, validFrom: yearStart, validTo: yearEnd },
      { partyNumber: "K-10047", articleNumber: "AT-4711", price: 438.5, validFrom: yearStart, validTo: yearEnd, note: "Rahmenvertrag RV-2026-07" },
      { partyNumber: "K-10047", articleNumber: "AT-6001", price: 589.0, validFrom: yearStart, validTo: yearEnd },
      { partyNumber: "K-10047", articleNumber: "AT-7302", price: 36.9, validFrom: yearStart, validTo: yearEnd },
      { partyNumber: "K-10047", articleNumber: "AT-8105", price: 26.4, validFrom: yearStart, validTo: yearEnd },
      { partyNumber: "K-10088", articleNumber: "AT-7302", price: 37.2, validFrom: yearStart, validTo: yearEnd },
      { partyNumber: "K-10088", articleNumber: "AT-3305", price: 4.95, validFrom: yearStart, validTo: yearEnd },
      { partyNumber: "K-10088", articleNumber: "AT-8105", price: 26.9, validFrom: yearStart, validTo: yearEnd },
      { partyNumber: "K-10112", articleNumber: "AT-6001", price: 595.0, validFrom: yearStart, validTo: yearEnd },
      { partyNumber: "K-10112", articleNumber: "AT-9010", price: 85.0, validFrom: yearStart, validTo: yearEnd },
    ],
    salesOrders: [
      {
        number: "A-2026-5521",
        customerNumber: "K-10023",
        customerPoNumber: "BM-PO-88231",
        date: d(-6),
        requestedDate: d(16),
        status: "open",
        lines: [
          { articleNo: "AT-4711", quantity: 4, unitPrice: 445.0 },
          { articleNo: "AT-2210", quantity: 10, unitPrice: 61.5 },
        ],
      },
      {
        number: "A-2026-5528",
        customerNumber: "K-10023",
        customerPoNumber: "BM-PO-88197",
        date: d(-9),
        requestedDate: d(2),
        status: "open",
        dependsOnPurchaseOrders: ["B-2026-0415"],
        lines: [{ articleNo: "AT-5120", quantity: 40, unitPrice: 124.0 }],
      },
      {
        number: "A-2026-5530",
        customerNumber: "K-10112",
        customerPoNumber: "RA-4410-26",
        date: d(-14),
        requestedDate: d(21),
        status: "in_production",
        dependsOnPurchaseOrders: ["B-2026-0398"],
        lines: [
          { articleNo: "AT-5120", quantity: 60, unitPrice: 129.0 },
          { articleNo: "AT-6001", quantity: 8, unitPrice: 595.0 },
        ],
      },
      {
        number: "A-2026-5534",
        customerNumber: "K-10047",
        customerPoNumber: "NF-2026-1102",
        date: d(-11),
        requestedDate: d(35),
        status: "open",
        dependsOnPurchaseOrders: ["B-2026-0398"],
        lines: [{ articleNo: "AT-5120", quantity: 25, unitPrice: 129.0 }],
      },
    ],
    purchaseOrders: [
      {
        number: "B-2026-0398",
        supplierNumber: "L-20011",
        date: d(-15),
        requestedDate: d(18),
        confirmedDate: d(18),
        status: "confirmed",
        lines: [
          { articleNo: "RM-1040", quantity: 180, unitPrice: 14.2 },
          { articleNo: "RM-1060", quantity: 120, unitPrice: 6.85 },
        ],
      },
      {
        number: "B-2026-0412",
        supplierNumber: "L-20034",
        date: d(-4),
        requestedDate: d(10),
        status: "sent",
        lines: [
          { articleNo: "AT-3305", quantity: 500, unitPrice: 3.85 },
          { articleNo: "AT-7302", quantity: 100, unitPrice: 22.1 },
        ],
      },
      {
        number: "B-2026-0420",
        supplierNumber: "L-20078",
        date: d(-3),
        requestedDate: d(12),
        status: "sent",
        lines: [
          { articleNo: "EL-3020", quantity: 12, unitPrice: 248.0 },
          { articleNo: "EL-3045", quantity: 30, unitPrice: 41.6 },
        ],
      },
      {
        number: "B-2026-0377",
        supplierNumber: "L-20034",
        date: d(-24),
        requestedDate: d(-3),
        confirmedDate: d(-3),
        status: "received",
        lines: [{ articleNo: "AT-3305", quantity: 1000, unitPrice: 3.85 }],
      },
      {
        number: "B-2026-0391",
        supplierNumber: "L-20011",
        date: d(-26),
        requestedDate: d(-13),
        confirmedDate: d(-13),
        status: "received",
        lines: [{ articleNo: "RM-1040", quantity: 200, unitPrice: 14.2 }],
      },
      {
        number: "B-2026-0405",
        supplierNumber: "L-20011",
        date: d(-12),
        requestedDate: d(-2),
        confirmedDate: d(-2),
        status: "received",
        lines: [
          { articleNo: "RM-1060", quantity: 400, unitPrice: 6.85 },
          { articleNo: "RM-1040", quantity: 200, unitPrice: 14.2 },
        ],
      },
      {
        number: "B-2026-0388",
        supplierNumber: "L-20078",
        date: d(-20),
        requestedDate: d(-6),
        confirmedDate: d(-6),
        status: "received",
        lines: [
          { articleNo: "EL-3020", quantity: 20, unitPrice: 248.0 },
          { articleNo: "EL-3045", quantity: 50, unitPrice: 41.6 },
        ],
      },
      {
        number: "B-2026-0415",
        supplierNumber: "L-20056",
        date: d(-2),
        requestedDate: d(1),
        confirmedDate: d(1),
        status: "confirmed",
        lines: [
          { articleNo: "LG-1001", quantity: 14, unitPrice: 58.0 },
          { articleNo: "LG-1002", quantity: 3, unitPrice: 15.0 },
        ],
      },
    ],
    receivedInvoices: [
      { supplierNumber: "L-20011", invoiceNumber: "RE-2026-10871", date: d(-12), grossTotal: 3379.6 },
      { supplierNumber: "L-20034", invoiceNumber: "RE-KB-2026-1102", date: d(-30), grossTotal: 2290.75 },
    ],
  };
}
