import { classifyDocument } from "@/server/documents/classify";
import { extractWithRules } from "@/server/documents/extract-rules";
import type { AnalyzeInput, DocumentAiProvider } from "./provider";

/**
 * Deterministic, offline "demo adapter": keyword/layout classification plus rule-based
 * extraction. Works without API keys and never sends data to third parties.
 */
export const demoRulesProvider: DocumentAiProvider = {
  id: "demo-rules",
  label: "Demo-Adapter (regelbasiert, lokal)",
  kind: "rules",
  async analyze(input: AnalyzeInput) {
    const c = classifyDocument(input.layout, input.emailSubject);
    return extractWithRules({
      layout: input.layout,
      docType: c.docType,
      docTypeConfidence: c.confidence,
      signals: c.signals,
      ownCompanyName: input.ownCompanyName,
      ownVatId: input.ownVatId,
      emailFromName: input.emailFromName,
    });
  },
};
