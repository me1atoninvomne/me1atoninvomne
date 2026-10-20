"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { commonDict } from "@/i18n/ui/common";
import { cn } from "@/lib/cn";

/**
 * Horizontal scroll container for wide tables. When the content actually overflows (small
 * screens), it becomes a focusable, labelled region so keyboard users can scroll it with the
 * arrow keys (WCAG 2.1.1); otherwise it adds no extra tab stop.
 */
export function ScrollX({ label, className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  const c = useT(commonDict);
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("overflow-x-auto", className)}
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable ? "region" : undefined}
      aria-label={scrollable ? (label ?? c.scrollTable) : undefined}
    >
      {children}
    </div>
  );
}
