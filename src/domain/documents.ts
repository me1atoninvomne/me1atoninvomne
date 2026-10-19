import type { Department, DocType, FieldKey, FieldKind, PartyRole } from "./types";

export interface DocTypeMeta {
  /** Who sends this document type to us. */
  partyRole: PartyRole;
  requiredFields: FieldKey[];
  optionalFields: FieldKey[];
  hasLineItems: boolean;
  defaultDepartment: Department;
}

export const DOC_TYPE_META: Record<DocType, DocTypeMeta> = {
  purchase_order: {
    partyRole: "customer",
    requiredFields: ["documentNumber", "documentDate", "partyName", "deliveryDate", "deliveryAddress"],
    optionalFields: ["partyNumber", "netTotal", "paymentTerms", "contactPerson", "currency"],
    hasLineItems: true,
    defaultDepartment: "sales",
  },
  invoice: {
    partyRole: "supplier",
    requiredFields: ["documentNumber", "documentDate", "partyName", "netTotal", "vatRate", "grossTotal", "iban"],
    optionalFields: ["referenceNumber", "vatAmount", "dueDate", "vatId", "paymentTerms", "partyNumber", "currency"],
    hasLineItems: true,
    defaultDepartment: "accounting",
  },
  order_confirmation: {
    partyRole: "supplier",
    requiredFields: ["documentNumber", "documentDate", "partyName", "referenceNumber", "deliveryDate"],
    optionalFields: ["netTotal", "partyNumber", "paymentTerms", "currency"],
    hasLineItems: true,
    defaultDepartment: "purchasing",
  },
  delivery_note: {
    partyRole: "supplier",
    requiredFields: ["documentNumber", "documentDate", "partyName", "referenceNumber"],
    optionalFields: ["deliveryAddress", "partyNumber"],
    hasLineItems: true,
    defaultDepartment: "logistics",
  },
  rfq: {
    partyRole: "customer",
    requiredFields: ["documentNumber", "documentDate", "partyName", "dueDate"],
    optionalFields: ["deliveryDate", "contactPerson", "partyNumber", "deliveryAddress"],
    hasLineItems: true,
    defaultDepartment: "sales",
  },
  delay_notice: {
    partyRole: "supplier",
    requiredFields: ["partyName", "referenceNumber", "originalDeliveryDate", "deliveryDate"],
    optionalFields: ["documentDate", "delayReason", "documentNumber", "contactPerson"],
    hasLineItems: false,
    defaultDepartment: "purchasing",
  },
  other: {
    partyRole: "customer",
    requiredFields: [],
    optionalFields: [],
    hasLineItems: false,
    defaultDepartment: "sales",
  },
};

export const FIELD_KIND: Record<FieldKey, FieldKind> = {
  documentNumber: "text",
  documentDate: "date",
  partyName: "text",
  partyNumber: "text",
  referenceNumber: "text",
  deliveryDate: "date",
  originalDeliveryDate: "date",
  deliveryAddress: "address",
  paymentTerms: "text",
  netTotal: "money",
  vatRate: "percent",
  vatAmount: "money",
  grossTotal: "money",
  currency: "text",
  iban: "iban",
  vatId: "text",
  dueDate: "date",
  contactPerson: "text",
  delayReason: "text",
};

/** Fields whose change by a reviewer is financially sensitive (four-eyes principle). */
export const SENSITIVE_FIELDS: FieldKey[] = ["netTotal", "grossTotal", "vatAmount", "iban"];

export function fieldsForDocType(docType: DocType): FieldKey[] {
  const meta = DOC_TYPE_META[docType];
  return [...meta.requiredFields, ...meta.optionalFields];
}

/** Net amount for a document: stated net total, otherwise the sum of line totals. */
export function documentNetAmount(
  fields: Partial<Record<FieldKey, { value: string | null }>>,
  lineItems: { total: number | null; quantity: number | null; unitPrice: number | null }[],
): number | null {
  const stated = fields.netTotal?.value;
  if (stated != null && stated !== "" && !Number.isNaN(Number(stated))) return Number(stated);
  if (lineItems.length === 0) return null;
  let sum = 0;
  for (const li of lineItems) {
    const t = li.total ?? (li.quantity != null && li.unitPrice != null ? li.quantity * li.unitPrice : null);
    if (t == null) return null;
    sum += t;
  }
  return round2(sum);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
