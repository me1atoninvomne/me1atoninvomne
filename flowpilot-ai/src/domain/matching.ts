import { nameSimilarity, normalizeCompanyName } from "./parse";
import type { AgreedPrice, Article, MasterData, PartyMatch, PartyRole, PurchaseOrder } from "./types";

const MATCH_THRESHOLD = 0.82;

/**
 * Finds the business partner a document belongs to. An explicit customer/supplier number
 * wins; otherwise the company name is compared against names and known aliases.
 */
export function matchParty(
  master: MasterData,
  role: PartyRole,
  name: string | null | undefined,
  number: string | null | undefined,
): PartyMatch | null {
  const list = role === "customer" ? master.customers : master.suppliers;
  if (number) {
    const byNumber = list.find((p) => p.number.toLowerCase() === number.trim().toLowerCase());
    if (byNumber) return { role, number: byNumber.number, name: byNumber.name, score: 1 };
  }
  if (!name) return null;
  let best: PartyMatch | null = null;
  for (const p of list) {
    const candidates = [p.name, ...(p.aliases ?? [])];
    for (const c of candidates) {
      const score = normalizeCompanyName(c) === normalizeCompanyName(name) ? 1 : nameSimilarity(c, name);
      if (!best || score > best.score) best = { role, number: p.number, name: p.name, score };
    }
  }
  return best && best.score >= MATCH_THRESHOLD ? best : null;
}

/** Looks up an article by our number or by a supplier's article number. */
export function findArticle(master: MasterData, articleNo: string | null | undefined, supplierNumber?: string | null): Article | null {
  if (!articleNo) return null;
  const key = articleNo.trim().toUpperCase();
  const own = master.articles.find((a) => a.number.toUpperCase() === key);
  if (own) return own;
  for (const a of master.articles) {
    const map = a.supplierNumbers ?? {};
    if (supplierNumber && map[supplierNumber]?.toUpperCase() === key) return a;
    if (!supplierNumber && Object.values(map).some((v) => v.toUpperCase() === key)) return a;
  }
  return null;
}

/** Agreed (framework contract) price valid on the given date, if any. */
export function findAgreedPrice(
  master: MasterData,
  partyNumber: string,
  articleNumber: string,
  onDate: string,
): AgreedPrice | null {
  return (
    master.agreedPrices.find(
      (p) =>
        p.partyNumber === partyNumber &&
        p.articleNumber === articleNumber &&
        p.validFrom <= onDate &&
        (p.validTo == null || p.validTo >= onDate),
    ) ?? null
  );
}

export function findPurchaseOrder(master: MasterData, reference: string | null | undefined): PurchaseOrder | null {
  if (!reference) return null;
  const key = reference.trim().toUpperCase();
  return master.purchaseOrders.find((po) => po.number.toUpperCase() === key) ?? null;
}
