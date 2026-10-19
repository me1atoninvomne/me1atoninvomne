/**
 * Core domain types for FlowPilot AI.
 *
 * Everything in `src/domain` is framework-free and side-effect-free so it can be
 * unit-tested in isolation and reused by API routes, background jobs and the UI.
 */

export const DOC_TYPES = [
  "purchase_order",
  "invoice",
  "order_confirmation",
  "delivery_note",
  "rfq",
  "delay_notice",
  "other",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

/** Business documents we actively process (everything except `other`). */
export const BUSINESS_DOC_TYPES = DOC_TYPES.filter((t) => t !== "other") as Exclude<DocType, "other">[];

/** Financially relevant documents: never released without a human. */
export const FINANCIAL_DOC_TYPES: DocType[] = ["invoice"];

export const DEPARTMENTS = ["sales", "purchasing", "accounting", "logistics", "production", "management"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const ROLES = ["admin", "manager", "clerk", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export type FieldKind = "text" | "date" | "money" | "percent" | "iban" | "address" | "number";

export const FIELD_KEYS = [
  "documentNumber",
  "documentDate",
  "partyName",
  "partyNumber",
  "referenceNumber",
  "deliveryDate",
  "originalDeliveryDate",
  "deliveryAddress",
  "paymentTerms",
  "netTotal",
  "vatRate",
  "vatAmount",
  "grossTotal",
  "currency",
  "iban",
  "vatId",
  "dueDate",
  "contactPerson",
  "delayReason",
] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export type FieldStatus = "extracted" | "missing" | "corrected" | "confirmed";

/**
 * A single extracted value. `value` is always stored in canonical form:
 * dates as `YYYY-MM-DD`, money as a decimal string (`"1234.50"`), percent as number string.
 * `null` means the value could not be reliably extracted – we never invent values.
 */
export interface ExtractedField {
  key: FieldKey;
  value: string | null;
  confidence: number; // 0..1
  /** Text snippet of the source document where the value was found. */
  source?: string | null;
  status: FieldStatus;
  /** Value before the first human correction. */
  originalValue?: string | null;
}

export interface LineItem {
  pos: string;
  articleNo: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  total: number | null;
  confidence: number;
  source?: string | null;
  corrected?: boolean;
}

export interface Extraction {
  docType: DocType;
  docTypeConfidence: number;
  fields: Partial<Record<FieldKey, ExtractedField>>;
  lineItems: LineItem[];
  /** False when the document has no machine-readable text (e.g. a scan without OCR). */
  textAvailable: boolean;
  /** Which provider produced this extraction (e.g. `demo-rules`, `anthropic`). */
  provider: string;
  /** Classification signals, kept for transparency in the activity timeline. */
  signals: string[];
}

export type Severity = "critical" | "warning" | "info";

export const ISSUE_CODES = [
  "MISSING_REQUIRED_FIELD",
  "MISSING_DELIVERY_DATE",
  "LOW_CONFIDENCE",
  "UNKNOWN_PARTY",
  "PRICE_MISMATCH",
  "UNKNOWN_ARTICLE",
  "DUPLICATE_ORDER",
  "DUPLICATE_INVOICE",
  "QTY_MISMATCH",
  "DATE_SHIFT",
  "SUM_MISMATCH",
  "VAT_MISMATCH",
  "IBAN_CHANGED",
  "IBAN_INVALID",
  "REFERENCE_NOT_FOUND",
  "DELIVERY_DELAY",
  "NO_TEXT_LAYER",
  "DEADLINE_SOON",
  "DATE_IN_PAST",
] as const;
export type IssueCode = (typeof ISSUE_CODES)[number];

export type IssueStatus = "open" | "resolved" | "accepted";

export interface ValidationIssue {
  id: string;
  code: IssueCode;
  severity: Severity;
  /** Blocking issues prevent automatic processing and must be resolved or accepted. */
  blocking: boolean;
  params: Record<string, string | number | null>;
  field?: FieldKey;
  lineIndex?: number;
  /** Monetary impact in EUR if quantifiable (used to prioritise exceptions). */
  amountAtRisk?: number | null;
  status: IssueStatus;
  resolution?: { by: string; at: string; note: string } | null;
}

export type Route = "auto" | "review" | "approval" | "ignore";

export interface RouteReason {
  code:
    | "GUARDRAIL_CRITICAL_ISSUE"
    | "GUARDRAIL_MISSING_FIELDS"
    | "GUARDRAIL_LOW_CONFIDENCE"
    | "GUARDRAIL_UNKNOWN_PARTY"
    | "GUARDRAIL_NO_TEXT"
    | "GUARDRAIL_FINANCIAL"
    | "GUARDRAIL_OPEN_WARNINGS"
    | "POLICY_AUTO_DISABLED"
    | "POLICY_AMOUNT_ABOVE_AUTO_LIMIT"
    | "POLICY_APPROVAL_LIMIT"
    | "RULE_REQUIRE_APPROVAL"
    | "RULE_REVIEW"
    | "RULE_CONTINUE"
    | "NO_CONTINUE_RULE"
    | "NOT_BUSINESS_DOCUMENT"
    | "ALL_CHECKS_PASSED";
  params?: Record<string, string | number | null>;
}

export interface RoutingDecision {
  route: Route;
  reasons: RouteReason[];
  /** Minimum role required to approve, if a human decision is needed. */
  requiredRole: Role | null;
  department: Department;
  priority: "high" | "normal" | "low";
  notify: Department[];
  /** IDs of rules that matched during evaluation. */
  matchedRules: string[];
  /** Effective confidence used for the gate. */
  confidence: number;
}

/** Workflow parameters editable by managers. They form the automation policy. */
export interface WorkflowParams {
  autoProcess: boolean;
  minConfidence: number; // 0..1
  maxAutoAmount: number | null; // EUR, net
  approvalLimit: number | null; // EUR, net – above requires manager approval
  reviewDepartment: Department;
  notifyDepartment: Department | null;
  slaHours: number;
  targetSystem: "demo_erp" | "none";
}

export type WorkflowStepType =
  | "trigger"
  | "classify"
  | "extract"
  | "match"
  | "validate"
  | "rules"
  | "gate"
  | "auto"
  | "review"
  | "transfer"
  | "notify";

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  /** Branch for steps after the confidence gate. */
  branch?: "auto" | "review";
}

export interface WorkflowDefinition {
  key: string;
  docTypes: DocType[];
  params: WorkflowParams;
  steps: WorkflowStep[];
}

/* ---------- No-code rules ---------- */

export const CONDITION_FIELDS = [
  "partyKnown",
  "allRequiredFields",
  "noOpenIssues",
  "hasCriticalIssue",
  "netAmount",
  "minConfidence",
  "delayDays",
  "deliveryLeadDays",
  "priceDeviationPct",
] as const;
export type ConditionField = (typeof CONDITION_FIELDS)[number];

export type ConditionOp = "is_true" | "is_false" | "gt" | "gte" | "lt" | "lte";

export interface RuleCondition {
  field: ConditionField;
  op: ConditionOp;
  value?: number | null;
}

export type RuleActionType = "continue" | "require_approval" | "route_review" | "notify" | "set_priority";

export interface RuleAction {
  type: RuleActionType;
  role?: Role;
  department?: Department;
  priority?: "high" | "normal" | "low";
}

export interface LocalizedText {
  de: string;
  en: string;
}

export interface Rule {
  id: string;
  name: LocalizedText;
  enabled: boolean;
  docTypes: DocType[] | "all";
  conditions: RuleCondition[];
  action: RuleAction;
}

/* ---------- Master data (ERP view) ---------- */

export interface Address {
  street: string;
  zip: string;
  city: string;
  country?: string;
}

export interface Customer {
  number: string;
  name: string;
  aliases?: string[];
  address: Address;
  vatId?: string;
  paymentTerms: string;
}

export interface Supplier {
  number: string;
  name: string;
  aliases?: string[];
  address: Address;
  iban: string;
  vatId?: string;
  phone: string;
}

export interface Article {
  number: string;
  description: string;
  unit: string;
  listPrice: number;
  /** Supplier article numbers mapped to our article, for purchasing documents. */
  supplierNumbers?: Record<string, string>;
  purchasePrice?: number;
}

export interface AgreedPrice {
  partyNumber: string; // customer or supplier
  articleNumber: string;
  price: number;
  validFrom: string;
  validTo: string | null;
  note?: string;
}

export interface OrderLine {
  articleNo: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesOrder {
  number: string; // our order number
  customerNumber: string;
  customerPoNumber: string;
  date: string;
  requestedDate: string;
  lines: OrderLine[];
  status: "open" | "in_production" | "shipped";
  /** Purchase orders that supply this sales order (for delay impact analysis). */
  dependsOnPurchaseOrders?: string[];
}

export interface PurchaseOrder {
  number: string;
  supplierNumber: string;
  date: string;
  requestedDate: string;
  lines: OrderLine[];
  status: "sent" | "confirmed" | "received";
  confirmedDate?: string | null;
}

export interface ReceivedInvoice {
  supplierNumber: string;
  invoiceNumber: string;
  date: string;
  grossTotal: number;
}

export interface MasterData {
  customers: Customer[];
  suppliers: Supplier[];
  articles: Article[];
  agreedPrices: AgreedPrice[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  receivedInvoices: ReceivedInvoice[];
}

export type PartyRole = "customer" | "supplier";

export interface PartyMatch {
  role: PartyRole;
  number: string;
  name: string;
  score: number; // 0..1
}
