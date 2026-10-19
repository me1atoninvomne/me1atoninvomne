/**
 * Claude-based extraction (optional). Active only when AI_PROVIDER=anthropic and an
 * ANTHROPIC_API_KEY is configured on the server. The key is never sent to the browser.
 *
 * Status: implemented against the official SDK, but not exercised in the demo environment
 * (no key available). Before productive use: evaluate on a labelled sample of real documents.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { DOC_TYPE_META, fieldsForDocType } from "@/domain/documents";
import { DOC_TYPES, FIELD_KEYS, type Extraction, type ExtractedField } from "@/domain/types";
import { layoutToText } from "@/server/documents/text-layout";
import { ProviderError, type AnalyzeInput, type DocumentAiProvider } from "./provider";

const FieldSchema = z.object({
  key: z.enum(FIELD_KEYS),
  value: z.string().nullable(),
  confidence: z.number(),
  source: z.string().nullable(),
});

const ExtractionSchema = z.object({
  docType: z.enum(DOC_TYPES),
  docTypeConfidence: z.number(),
  fields: z.array(FieldSchema),
  lineItems: z.array(
    z.object({
      pos: z.string(),
      articleNo: z.string().nullable(),
      description: z.string().nullable(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      unitPrice: z.number().nullable(),
      total: z.number().nullable(),
      confidence: z.number(),
    }),
  ),
});

const SYSTEM = `You extract data from German B2B business documents (purchase orders, invoices, order confirmations, delivery notes, requests for quotation, delivery delay notifications) received by the company "{OWN}".
Rules:
- Only report values that are literally present in the document. If a value is not present or not legible, return value null and confidence 0. Never infer or invent values.
- The party (partyName) is the SENDER of the document, never "{OWN}".
- Canonical formats: dates as YYYY-MM-DD (convert "KW 47/2026" to the Monday of that ISO week), money as decimal with a dot ("1234.50"), vatRate as number ("19"), IBAN without spaces.
- referenceNumber is the recipient's own order number the document refers to (e.g. "Ihre Bestellung").
- confidence is your probability (0..1) that the value is correct; source is the short text snippet where you found it.
- Use docType "other" for newsletters, advertising and anything that is not one of the business document types.`;

export function createAnthropicProvider(): DocumentAiProvider {
  const model = process.env.AI_MODEL || "claude-opus-5-5";
  return {
    id: "anthropic",
    label: `Claude (${model})`,
    kind: "llm",
    async analyze(input: AnalyzeInput): Promise<Extraction> {
      if (!process.env.ANTHROPIC_API_KEY) throw new ProviderError("ANTHROPIC_API_KEY is not set", "not_configured");
      const client = new Anthropic();
      const content: Anthropic.Beta.BetaContentBlockParam[] = [];
      if (input.pdf && input.pdf.length > 0) {
        content.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: Buffer.from(input.pdf).toString("base64") },
        });
      }
      content.push({
        type: "text",
        text: [
          `E-mail subject: ${input.emailSubject}`,
          `E-mail sender: ${input.emailFromName}`,
          input.fileName ? `Attachment: ${input.fileName}` : "No attachment – the e-mail body is the document.",
          "Extracted text layer (tabs separate columns):",
          layoutToText(input.layout) || "(no text layer)",
        ].join("\n"),
      });

      let response;
      try {
        response = await client.beta.messages.parse({
          model,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: SYSTEM.replaceAll("{OWN}", input.ownCompanyName),
          output_config: { effort: "medium", format: betaZodOutputFormat(ExtractionSchema) },
          messages: [{ role: "user", content }],
        });
      } catch (error) {
        if (error instanceof Anthropic.APIError) {
          throw new ProviderError(`Claude API error ${error.status}: ${error.message}`, "upstream");
        }
        throw error;
      }
      if (response.stop_reason === "refusal") throw new ProviderError("The model declined the request", "refusal");
      const parsed = response.parsed_output;
      if (!parsed) throw new ProviderError("No structured output returned", "invalid_output");

      const wanted = new Set(fieldsForDocType(parsed.docType));
      const fields: Extraction["fields"] = {};
      for (const key of wanted) {
        const f = parsed.fields.find((x) => x.key === key);
        const value = f?.value && f.value.trim() !== "" ? f.value.trim() : null;
        const field: ExtractedField = {
          key,
          value,
          confidence: value ? clamp(f?.confidence ?? 0.5) : 0,
          source: f?.source ?? null,
          status: value ? "extracted" : "missing",
        };
        fields[key] = field;
      }
      return {
        docType: parsed.docType,
        docTypeConfidence: clamp(parsed.docTypeConfidence),
        fields,
        lineItems: DOC_TYPE_META[parsed.docType].hasLineItems
          ? parsed.lineItems.map((li) => ({ ...li, confidence: clamp(li.confidence), source: null }))
          : [],
        textAvailable: input.layout.hasText || Boolean(input.pdf),
        provider: `anthropic:${response.model}`,
        signals: ["llm"],
      };
    },
  };
}

const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
