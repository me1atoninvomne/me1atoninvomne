import Link from "next/link";
import { Fragment } from "react";

const TOKEN = /(\[\[[^\]]+\]\]|\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

/** Renders the small inline markup used in legal texts (see src/legal/types.ts). */
export function RichText({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter((p) => p !== "");
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("[[") && p.endsWith("]]")) {
          return (
            <mark key={i} className="rounded bg-amber-100 px-1 py-0.5 font-medium text-amber-900 ring-1 ring-amber-300 ring-inset">
              {p.slice(2, -2)}
            </mark>
          );
        }
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-slate-900">
              <RichText text={p.slice(2, -2)} />
            </strong>
          );
        }
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(p);
        if (link) {
          const [, label, href] = link;
          const cls = "font-medium text-navy-700 underline underline-offset-2 hover:text-navy-900";
          // Static files (e.g. licence texts) need a plain link, not client-side routing.
          if ((href.startsWith("/") || href.startsWith("#")) && !/\.[a-z0-9]+$/i.test(href)) {
            return (
              <Link key={i} href={href} className={cls}>
                {label}
              </Link>
            );
          }
          return (
            <a key={i} href={href} className={cls} rel="noopener noreferrer">
              {label}
            </a>
          );
        }
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
