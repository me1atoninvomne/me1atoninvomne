/**
 * The core processing chain for one document, independent of storage:
 * extract text → classify & extract (AI provider) → match master data → validate → rules → route.
 * Each step is timed and reported, which feeds the AI activity timeline.
 */
import { DOC_TYPE_META } from "@/domain/documents";
import { matchParty } from "@/domain/matching";
import { decideRoute, type RoutingResult } from "@/domain/routing";
import { computeFacts, type RuleFacts } from "@/domain/rules";
import type { Extraction, MasterData, PartyMatch, Rule, ValidationIssue, WorkflowParams, DocType } from "@/domain/types";
import { validateDocument, type KnownDocument } from "@/domain/validation";
import { workflowForDocType } from "@/domain/workflows";
import type { DocumentAiProvider } from "@/server/ai/provider";
import { extractLayout, textToLayout, type TextLayout } from "@/server/documents/text-layout";

export interface WorkflowLike {
  id: string;
  docTypes: DocType[];
  active: boolean;
  params: WorkflowParams;
}

export interface AnalyzeDocumentInput {
  pdf: Uint8Array | null;
  /** Used as document text if there is no PDF (order written in the e-mail body). */
  bodyText: string;
  fileName: string | null;
  emailSubject: string;
  emailFromName: string;
  emailReceivedAt: string; // ISO datetime
  ownCompanyName: string;
  ownVatId?: string;
  master: MasterData;
  knownDocuments: KnownDocument[];
  workflows: WorkflowLike[];
  rules: Rule[];
  today: string;
  provider: DocumentAiProvider;
  /** Issues already decided by humans (kept when re-validating after corrections). */
  previousIssues?: ValidationIssue[];
  /** Skip extraction and re-validate an existing (possibly corrected) extraction. */
  existingExtraction?: Extraction;
}

export interface StepTrace {
  step: "text" | "classify" | "extract" | "match" | "validate" | "rules" | "route";
  ms: number;
  detail: Record<string, unknown>;
}

export interface AnalysisResult {
  layout: TextLayout;
  extraction: Extraction;
  party: PartyMatch | null;
  issues: ValidationIssue[];
  facts: RuleFacts;
  routing: RoutingResult;
  workflowId: string | null;
  trace: StepTrace[];
}

export async function analyzeDocument(input: AnalyzeDocumentInput): Promise<AnalysisResult> {
  const trace: StepTrace[] = [];
  const timed = async <T>(step: StepTrace["step"], fn: () => Promise<T> | T, detail: (r: T) => Record<string, unknown>) => {
    const t0 = performance.now();
    const r = await fn();
    trace.push({ step, ms: Math.round((performance.now() - t0) * 10) / 10, detail: detail(r) });
    return r;
  };

  const layout = await timed(
    "text",
    async () => (input.pdf ? extractLayout(input.pdf) : textToLayout(input.bodyText)),
    (l) => ({ source: input.pdf ? "pdf" : "email_body", lines: l.lines.length, pages: l.pageCount, hasText: l.hasText }),
  );

  let extraction: Extraction;
  if (input.existingExtraction) {
    extraction = input.existingExtraction;
  } else {
    // The provider classifies and extracts in one call; both are reported as separate steps.
    const t0 = performance.now();
    extraction = await input.provider.analyze({
      layout,
      pdf: input.pdf,
      fileName: input.fileName,
      emailSubject: input.emailSubject,
      emailFromName: input.emailFromName,
      ownCompanyName: input.ownCompanyName,
      ownVatId: input.ownVatId,
    });
    const ms = Math.round((performance.now() - t0) * 10) / 10;
    trace.push({
      step: "classify",
      ms,
      detail: { provider: input.provider.id, docType: extraction.docType, confidence: extraction.docTypeConfidence, signals: extraction.signals },
    });
    trace.push({
      step: "extract",
      ms: 0,
      detail: {
        provider: input.provider.id,
        fieldsFound: Object.values(extraction.fields).filter((f) => f?.value != null).length,
        fieldsMissing: Object.values(extraction.fields).filter((f) => f?.value == null).map((f) => f!.key),
        lineItems: extraction.lineItems.length,
      },
    });
    // An order written in the e-mail body has no document date of its own – the receipt date is
    // metadata of the e-mail, not an invented value. It is marked with its source.
    const dateField = extraction.fields.documentDate;
    if (!input.pdf && dateField && dateField.value == null && extraction.docType !== "other") {
      extraction.fields.documentDate = {
        key: "documentDate",
        value: input.emailReceivedAt.slice(0, 10),
        confidence: 0.85,
        source: "E-Mail-Eingangsdatum",
        status: "extracted",
      };
    }
  }

  const meta = DOC_TYPE_META[extraction.docType];
  const party = await timed(
    "match",
    () =>
      extraction.docType === "other"
        ? null
        : matchParty(input.master, meta.partyRole, extraction.fields.partyName?.value, extraction.fields.partyNumber?.value),
    (p) => ({ role: meta.partyRole, matched: p?.number ?? null, name: p?.name ?? null, score: p ? Math.round(p.score * 100) / 100 : null }),
  );

  const issues = await timed(
    "validate",
    () => mergeDecisions(validateDocument(extraction, { master: input.master, party, today: input.today, knownDocuments: input.knownDocuments }), input.previousIssues),
    (list) => ({ checks: list.length, codes: list.map((i) => i.code), critical: list.filter((i) => i.severity === "critical").length }),
  );

  const facts = computeFacts(extraction, issues, party, input.today);
  const workflow = workflowForDocType(input.workflows, extraction.docType);
  const routing = await timed(
    "route",
    () => decideRoute({ extraction, issues, facts, workflow: workflow?.params ?? null, rules: input.rules }),
    (r) => ({
      route: r.route,
      requiredRole: r.requiredRole,
      department: r.department,
      reasons: r.reasons.map((x) => x.code),
      matchedRules: r.matchedRules,
      confidence: Math.round(r.confidence * 100),
      workflow: workflow?.id ?? null,
    }),
  );
  trace.splice(trace.length - 1, 0, {
    step: "rules",
    ms: 0,
    detail: {
      evaluated: routing.ruleEvaluations.map((e) => ({ rule: e.rule.id, matched: e.matched })),
      facts,
    },
  });

  return { layout, extraction, party, issues, facts, routing, workflowId: workflow?.id ?? null, trace };
}

/** Re-validation keeps human decisions: an accepted/resolved issue with the same code & position stays decided. */
export function mergeDecisions(fresh: ValidationIssue[], previous?: ValidationIssue[]): ValidationIssue[] {
  if (!previous?.length) return fresh;
  return fresh.map((issue) => {
    const prior = previous.find(
      (p) => p.code === issue.code && p.field === issue.field && p.lineIndex === issue.lineIndex && p.status !== "open",
    );
    return prior ? { ...issue, status: prior.status, resolution: prior.resolution } : issue;
  });
}
