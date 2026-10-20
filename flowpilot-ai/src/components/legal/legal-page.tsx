import { Callout } from "@/components/ui/feedback";
import { formatters, type Lang } from "@/i18n/core";
import { legalDict } from "@/i18n/ui/legal";
import type { LegalBlock, LegalDoc } from "@/legal/types";
import { RichText } from "./rich-text";

/** Shared layout for all legal documents: title, version, table of contents, sections. */
export function LegalPage({
  doc,
  lang,
  version,
  reviewed,
  companyConfigured,
  children,
}: {
  doc: LegalDoc;
  lang: Lang;
  version: string;
  reviewed: boolean;
  companyConfigured: boolean;
  children?: React.ReactNode;
}) {
  const t = legalDict[lang];
  const f = formatters(lang);
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <header className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-slate-900 sm:text-3xl">{doc.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {t.page.version}: <time dateTime={version}>{f.date(version)}</time>
          </p>
          {doc.intro && (
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              <RichText text={doc.intro} />
            </p>
          )}
        </header>
        <div className="mt-6 max-w-3xl space-y-3">
          {!reviewed && (
            <Callout tone="warning" title={t.page.templateTitle}>
              {t.page.templateText}
            </Callout>
          )}
          {!companyConfigured && <Callout tone="warning">{t.page.missingCompany}</Callout>}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label={t.page.toc} className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{t.page.toc}</p>
            <ol className="mt-3 space-y-1.5 text-sm">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-2 rounded text-slate-600 hover:text-slate-900">
                    <span className="tabular w-5 shrink-0 text-slate-500">{i + 1}.</span>
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="max-w-3xl min-w-0 space-y-10">
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24" aria-labelledby={`${s.id}-title`}>
                <h2 id={`${s.id}-title`} className="text-lg font-semibold text-slate-900">
                  {i + 1}. {s.title}
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-700">
                  {s.blocks.map((b, j) => (
                    <Block key={j} block={b} label={s.title} />
                  ))}
                </div>
              </section>
            ))}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ block, label }: { block: LegalBlock; label: string }) {
  if (typeof block === "string") {
    return (
      <p>
        <RichText text={block} />
      </p>
    );
  }
  if ("list" in block) {
    return (
      <ul className="list-disc space-y-1.5 pl-5 marker:text-slate-400">
        {block.list.map((item, i) => (
          <li key={i}>
            <RichText text={item} />
          </li>
        ))}
      </ul>
    );
  }
  if ("note" in block) {
    return (
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 ring-inset">
        <RichText text={block.note} />
      </div>
    );
  }
  return (
    // Focusable so the horizontally scrollable table can be scrolled with the keyboard.
    <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600" tabIndex={0} role="region" aria-label={label}>
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            {block.table.head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {block.table.rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td key={j} className={j === 0 && block.table.mono ? "px-3 py-2 font-mono text-[13px] whitespace-nowrap text-slate-800" : j === 0 ? "px-3 py-2 font-medium text-slate-800" : "px-3 py-2 text-slate-700"}>
                  <RichText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
