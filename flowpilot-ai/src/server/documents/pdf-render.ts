/**
 * Renders synthetic business documents as real PDF files (pdf-lib, standard fonts).
 * The demo pipeline then reads these PDFs back with the same text extraction that is used for
 * uploaded files – the demo does not shortcut the processing path.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface DocItem {
  pos: string;
  articleNo: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice?: string;
  total?: string;
}

export interface DocSpec {
  title: string;
  sender: { name: string; street: string; zipCity: string; phone?: string; email?: string };
  recipient: { name: string; attention?: string; street: string; zipCity: string };
  meta: [string, string][];
  intro?: string[];
  items?: DocItem[];
  priced?: boolean;
  totals?: [string, string][];
  blocks?: { label: string; lines: string[] }[];
  closing?: string[];
  footer: string[];
  /** Render as an image-like scan without a text layer. */
  scan?: boolean;
}

const A4: [number, number] = [595.28, 841.89];
const INK = rgb(0.12, 0.14, 0.18);
const MUTED = rgb(0.4, 0.43, 0.48);
const RULE = rgb(0.8, 0.82, 0.86);

export async function renderPdf(spec: DocSpec): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(spec.title);
  pdf.setProducer("FlowPilot AI – synthetisches Demodokument");
  pdf.setCreator("FlowPilot AI Demo");
  const page = pdf.addPage(A4);
  if (spec.scan) {
    drawScan(page);
    return pdf.save();
  }
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const text = (s: string, x: number, y: number, size = 9.5, font: PDFFont = regular, color = INK) =>
    page.drawText(s, { x, y, size, font, color });
  const right = (s: string, xRight: number, y: number, size = 9.5, font: PDFFont = regular) =>
    text(s, xRight - font.widthOfTextAtSize(s, size), y, size, font);

  // Letterhead
  text(spec.sender.name, 50, 790, 14, bold);
  const contact = [spec.sender.street, spec.sender.zipCity, spec.sender.phone ? `Tel. ${spec.sender.phone}` : null, spec.sender.email]
    .filter(Boolean)
    .join(" · ");
  text(contact, 50, 775, 8, regular, MUTED);
  page.drawLine({ start: { x: 50, y: 766 }, end: { x: 545, y: 766 }, thickness: 0.6, color: RULE });

  // Recipient
  let y = 728;
  for (const line of [spec.recipient.name, spec.recipient.attention, spec.recipient.street, spec.recipient.zipCity]) {
    if (!line) continue;
    text(line, 50, y, 10);
    y -= 14;
  }

  // Meta block
  let my = 728;
  for (const [label, value] of spec.meta) {
    text(`${label}: ${value}`, 330, my, 9.5);
    my -= 14;
  }

  // Title
  y = Math.min(y, my) - 34;
  text(spec.title, 50, y, 16, bold);
  y -= 24;

  for (const line of spec.intro ?? []) {
    text(line, 50, y, 10);
    y -= 14;
  }

  // Items table
  if (spec.items && spec.items.length > 0) {
    y -= 8;
    const priced = spec.priced !== false;
    const header = (s: string, x: number, alignRight = false) =>
      alignRight ? right(s, x, y, 8.5, bold) : text(s, x, y, 8.5, bold);
    header("Pos", 50);
    header("Artikel-Nr.", 80);
    header("Bezeichnung", 168);
    header("Menge", priced ? 380 : 470, true);
    header("Einheit", priced ? 386 : 478);
    if (priced) {
      header("Einzelpreis", 478, true);
      header("Gesamt", 545, true);
    }
    y -= 6;
    page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: RULE });
    y -= 13;
    for (const it of spec.items) {
      text(it.pos, 50, y, 9);
      text(it.articleNo, 80, y, 9);
      text(it.description, 168, y, 9);
      right(it.quantity, priced ? 380 : 470, y, 9);
      text(it.unit, priced ? 386 : 478, y, 9);
      if (priced) {
        if (it.unitPrice) right(it.unitPrice, 478, y, 9);
        if (it.total) right(it.total, 545, y, 9);
      }
      y -= 15;
    }
    page.drawLine({ start: { x: 50, y: y + 6 }, end: { x: 545, y: y + 6 }, thickness: 0.5, color: RULE });
    y -= 8;
  }

  // Totals
  for (const [i, [label, value]] of (spec.totals ?? []).entries()) {
    const isLast = i === (spec.totals?.length ?? 0) - 1;
    text(`${label}:`, 330, y, 9.5, isLast ? bold : regular);
    right(value, 545, y, 9.5, isLast ? bold : regular);
    y -= 14;
  }
  if (spec.totals?.length) y -= 10;

  // Blocks
  for (const block of spec.blocks ?? []) {
    text(`${block.label}:`, 50, y, 9.5, bold);
    y -= 13;
    for (const line of block.lines) {
      text(line, 50, y, 9.5);
      y -= 13;
    }
    y -= 8;
  }

  for (const line of spec.closing ?? []) {
    text(line, 50, y, 10);
    y -= 14;
  }

  // Footer
  page.drawLine({ start: { x: 50, y: 74 }, end: { x: 545, y: 74 }, thickness: 0.5, color: RULE });
  let fy = 62;
  for (const line of spec.footer) {
    text(line, 50, fy, 7.5, regular, MUTED);
    fy -= 10;
  }
  text("Synthetisches Demodokument – erstellt von FlowPilot AI, enthält keine echten Geschäftsdaten.", 50, 24, 6.5, regular, MUTED);

  return pdf.save();
}

/** A scan without text layer: grey blocks where text would be, slightly uneven like a photocopy. */
function drawScan(page: PDFPage) {
  page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: rgb(0.96, 0.955, 0.94) });
  const bar = (x: number, y: number, w: number, h = 6, shade = 0.55) =>
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(shade, shade, shade * 0.98) });
  bar(52, 788, 210, 11, 0.35);
  bar(52, 772, 300, 5);
  bar(52, 724, 150);
  bar(52, 710, 120);
  bar(52, 696, 135);
  bar(332, 724, 160);
  bar(332, 710, 140);
  bar(332, 696, 150);
  bar(52, 640, 140, 12, 0.3);
  let y = 600;
  for (let i = 0; i < 6; i++) {
    bar(52, y, 18);
    bar(84, y, 60);
    bar(170, y, 150 + ((i * 37) % 60));
    bar(420, y, 40);
    bar(470, y, 30);
    y -= 18;
  }
  bar(52, 420, 240);
  bar(52, 404, 190);
  bar(330, 300, 160, 18, 0.7);
  page.drawLine({ start: { x: 340, y: 296 }, end: { x: 470, y: 312 }, thickness: 1.4, color: rgb(0.2, 0.25, 0.5) });
}
