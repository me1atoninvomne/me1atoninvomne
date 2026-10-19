/**
 * Layout-aware text extraction from PDFs.
 *
 * pdf.js returns positioned text runs. We rebuild visual lines (same baseline) and keep column
 * structure: large horizontal gaps become a TAB, small gaps a space. This keeps tables parseable
 * without OCR, as long as the PDF has a text layer.
 */
import { getDocumentProxy } from "unpdf";

export interface LayoutLine {
  text: string;
  /** Largest font size on the line (used to detect titles and letterheads). */
  fontSize: number;
  page: number;
  y: number;
}

export interface TextLayout {
  lines: LayoutLine[];
  pageCount: number;
  hasText: boolean;
}

interface Run {
  str: string;
  x: number;
  y: number;
  width: number;
  size: number;
}

export async function extractLayout(bytes: Uint8Array): Promise<TextLayout> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const lines: LayoutLine[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const runs: Run[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const [a, b, , , e, f] = item.transform as number[];
      runs.push({ str: item.str, x: e, y: f, width: item.width, size: Math.hypot(a, b) });
    }
    runs.sort((r1, r2) => r2.y - r1.y || r1.x - r2.x);
    const grouped: Run[][] = [];
    for (const run of runs) {
      const last = grouped[grouped.length - 1];
      if (last && Math.abs(last[0].y - run.y) <= 2) last.push(run);
      else grouped.push([run]);
    }
    for (const group of grouped) {
      group.sort((r1, r2) => r1.x - r2.x);
      let text = "";
      let prevEnd: number | null = null;
      for (const r of group) {
        if (prevEnd != null) {
          const gap = r.x - prevEnd;
          text += gap > r.size * 1.2 ? "\t" : gap > r.size * 0.15 ? " " : "";
        }
        text += r.str;
        prevEnd = r.x + r.width;
      }
      lines.push({ text: text.trim(), fontSize: Math.max(...group.map((r) => r.size)), page: p, y: group[0].y });
    }
  }
  await pdf.cleanup?.();
  return { lines, pageCount: pdf.numPages, hasText: lines.length > 0 };
}

/** Plain text representation (tabs preserved) for display and full-text search. */
export function layoutToText(layout: TextLayout): string {
  return layout.lines.map((l) => l.text).join("\n");
}

/** Builds a pseudo layout from e-mail body text (no font information). */
export function textToLayout(text: string): TextLayout {
  const lines = text
    .split(/\r?\n/)
    .map((t, i) => ({ text: t.trim(), fontSize: 10, page: 1, y: -i }))
    .filter((l) => l.text.length > 0);
  return { lines, pageCount: 1, hasText: lines.length > 0 };
}
