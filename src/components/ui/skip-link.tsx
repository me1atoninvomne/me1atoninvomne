"use client";

import { useT } from "@/i18n/client";
import { commonDict } from "@/i18n/ui/common";

/**
 * First focusable element of every layout: lets keyboard and screen-reader users jump past the
 * navigation. The target must exist with `id="main"` and `tabIndex={-1}`.
 */
export function SkipLink({ target = "main" }: { target?: string }) {
  const c = useT(commonDict);
  return (
    <a
      href={`#${target}`}
      className="sr-only z-[100] rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
    >
      {c.skipToContent}
    </a>
  );
}
