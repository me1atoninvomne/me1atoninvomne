"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { Spinner } from "../../ui/feedback";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Line {
  text: string;
  items: { str: string; box: Box }[];
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Renders the first pages of a PDF with pdf.js (loaded lazily) and overlays a highlight on the
 * text that a field was extracted from. Lines are rebuilt with the same rules as the server-side
 * layout extraction, so the "source" snippet of a field maps back to positions on the page.
 */
export function PdfCanvas({
  url,
  highlight,
  onFallback,
  label,
  loadingLabel,
}: {
  url: string;
  highlight: string | null;
  onFallback: () => void;
  /** Text alternative for the rendered page (the canvas is an image for assistive technology). */
  label: string;
  loadingLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (width < 50) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        const { getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(bytes);
        const page = await pdf.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const scale = width / base.width;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;
        const content = await page.getTextContent();
        const runs: { str: string; x: number; y: number; w: number; size: number }[] = [];
        for (const item of content.items as { str?: string; transform?: number[]; width?: number }[]) {
          if (!item.str?.trim() || !item.transform) continue;
          const [a, b, , , e, f] = item.transform;
          runs.push({ str: item.str, x: e, y: f, w: item.width ?? 0, size: Math.hypot(a, b) });
        }
        runs.sort((r1, r2) => r2.y - r1.y || r1.x - r2.x);
        const groups: (typeof runs)[] = [];
        for (const r of runs) {
          const last = groups[groups.length - 1];
          if (last && Math.abs(last[0].y - r.y) <= 2) last.push(r);
          else groups.push([r]);
        }
        const built: Line[] = groups.map((g) => {
          g.sort((r1, r2) => r1.x - r2.x);
          let text = "";
          let prevEnd: number | null = null;
          for (const r of g) {
            if (prevEnd != null) {
              const gap = r.x - prevEnd;
              text += gap > r.size * 1.2 ? "\t" : gap > r.size * 0.15 ? " " : "";
            }
            text += r.str;
            prevEnd = r.x + r.w;
          }
          return {
            text: text.trim(),
            items: g.map((r) => ({
              str: r.str,
              box: { left: r.x * scale, top: viewport.height - (r.y + r.size * 0.95) * scale, width: r.w * scale, height: r.size * 1.25 * scale },
            })),
          };
        });
        if (cancelled) return;
        setLines(built);
        setSize({ w: viewport.width, h: viewport.height });
        setLoading(false);
      } catch (err) {
        console.warn("[pdf] canvas rendering failed, falling back to browser viewer", err);
        if (!cancelled) onFallback();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, width, onFallback]);

  const boxes: Box[] = [];
  if (highlight && lines.length) {
    const pieces = highlight.split(" / ").map(norm).filter((p) => p.length > 1);
    for (const line of lines) {
      const lt = norm(line.text);
      for (const piece of pieces) {
        if (!(lt === piece || lt.includes(piece) || piece.includes(lt))) continue;
        const hit = line.items.filter((it) => {
          const s = norm(it.str);
          return s.length > 0 && (piece.includes(s) || s.includes(piece));
        });
        const chosen = hit.length ? hit : line.items;
        const left = Math.min(...chosen.map((c) => c.box.left));
        const top = Math.min(...chosen.map((c) => c.box.top));
        const right = Math.max(...chosen.map((c) => c.box.left + c.box.width));
        const bottom = Math.max(...chosen.map((c) => c.box.top + c.box.height));
        boxes.push({ left: left - 3, top: top - 2, width: right - left + 6, height: bottom - top + 4 });
        break;
      }
    }
  }

  useEffect(() => {
    if (!boxes.length) return;
    wrapRef.current?.querySelector("[data-hl]")?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, lines.length]);

  return (
    <div ref={wrapRef} className="relative w-full bg-slate-100">
      {loading && (
        <div className="absolute inset-0 z-10 flex min-h-[520px] items-center justify-center text-slate-500" role="status">
          <Spinner className="size-5" />
          <span className="sr-only">{loadingLabel}</span>
        </div>
      )}
      <div className="relative mx-auto shadow-sm" style={size ? { width: size.w, height: size.h } : { minHeight: 520 }}>
        <canvas ref={canvasRef} className="block bg-white" role="img" aria-label={label} />
        {boxes.map((b, i) => (
          <div
            key={i}
            data-hl
            aria-hidden
            className="pointer-events-none absolute rounded-[3px] bg-amber-300/35 ring-2 ring-amber-500/80"
            style={{ left: b.left, top: b.top, width: b.width, height: b.height }}
          />
        ))}
      </div>
    </div>
  );
}
