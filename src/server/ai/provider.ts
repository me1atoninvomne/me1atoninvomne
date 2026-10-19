/**
 * AI provider abstraction. The pipeline only talks to `DocumentAiProvider`; which implementation
 * runs is decided by configuration (AI_PROVIDER env). Providers never write to business systems –
 * they only classify and extract. Validation, routing and approvals stay deterministic.
 */
import type { DocType, Extraction } from "@/domain/types";
import type { TextLayout } from "@/server/documents/text-layout";

export interface AnalyzeInput {
  layout: TextLayout;
  /** Raw PDF bytes if available (LLM providers may read the PDF directly). */
  pdf?: Uint8Array | null;
  fileName: string | null;
  emailSubject: string;
  emailFromName: string;
  ownCompanyName: string;
  ownVatId?: string;
}

export interface DocumentAiProvider {
  id: string;
  /** Human readable label for audit log and integrations page. */
  label: string;
  kind: "rules" | "llm";
  analyze(input: AnalyzeInput): Promise<Extraction>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "refusal" | "invalid_output" | "upstream",
  ) {
    super(message);
  }
}

export type { DocType };
