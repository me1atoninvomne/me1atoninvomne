import { z } from "zod";
import { INDUSTRY_TEMPLATES } from "@/domain/templates";
import { demoRulesProvider } from "@/server/ai/demo-provider";
import { buildCorpus } from "@/server/demo/corpus";
import { buildMasterData, OWN_COMPANY } from "@/server/demo/master-data";
import { renderPdf } from "@/server/documents/pdf-render";
import { api, readJson } from "@/server/http";
import { todayIso } from "@/server/ids";
import { analyzeDocument } from "@/server/pipeline/analyze";
import { rateLimit } from "@/server/rate-limit";

const SAMPLES = ["po_price_mismatch", "inv_iban_changed", "delay_critical", "po_clean"] as const;
const Input = z.object({ key: z.enum(SAMPLES) });

/**
 * Landing-page demo: runs the real pipeline on a synthetic sample, in memory, without storing
 * anything. No upload of visitor data is possible here.
 */
export const POST = api(async (req) => {
  rateLimit(req, "analyze-sample", 120, 60 * 60 * 1000);
  const { key } = await readJson(req, Input);
  const today = todayIso();
  const e = buildCorpus(today)[key];
  const tpl = INDUSTRY_TEMPLATES.order_processing;
  const r = await analyzeDocument({
    pdf: await renderPdf(e.attachments[0].spec),
    bodyText: e.body,
    fileName: e.attachments[0].fileName,
    emailSubject: e.subject,
    emailFromName: e.fromName,
    emailReceivedAt: new Date().toISOString(),
    ownCompanyName: OWN_COMPANY.name,
    ownVatId: OWN_COMPANY.vatId,
    master: buildMasterData(today),
    knownDocuments: [],
    workflows: tpl.workflows.map((w) => ({ id: w.key, docTypes: w.docTypes, active: true, params: w.params })),
    rules: tpl.rules,
    today,
    provider: demoRulesProvider,
  });
  return {
    email: { from: `${e.fromName} <${e.fromEmail}>`, subject: e.subject, fileName: e.attachments[0].fileName },
    docType: r.extraction.docType,
    docTypeConfidence: r.extraction.docTypeConfidence,
    fields: Object.values(r.extraction.fields).map((f) => ({ key: f!.key, value: f!.value, confidence: f!.confidence })),
    lineItems: r.extraction.lineItems.map((li) => ({ pos: li.pos, articleNo: li.articleNo, quantity: li.quantity, unit: li.unit, unitPrice: li.unitPrice, total: li.total })),
    issues: r.issues.filter((i) => i.code !== "LOW_CONFIDENCE").map((i) => ({ code: i.code, severity: i.severity, params: i.params })),
    routing: { route: r.routing.route, reasons: r.routing.reasons, confidence: r.routing.confidence, requiredRole: r.routing.requiredRole },
    ruleNames: Object.fromEntries(tpl.rules.map((rule) => [rule.id, rule.name])),
    trace: r.trace.map((t) => ({ step: t.step, ms: t.ms })),
  };
});
