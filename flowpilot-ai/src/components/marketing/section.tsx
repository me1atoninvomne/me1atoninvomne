import { cn } from "@/lib/cn";

export function Section({
  id,
  eyebrow,
  title,
  text,
  children,
  className,
  tone = "white",
  center,
  level = 2,
}: {
  id?: string;
  eyebrow?: string;
  title?: React.ReactNode;
  text?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  tone?: "white" | "muted" | "navy";
  center?: boolean;
  /** Use 1 for the first section of a sub page (its page title). */
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  const bg = { white: "bg-white", muted: "bg-slate-50 border-y border-slate-200/70", navy: "bg-navy-950 text-white" }[tone];
  return (
    <section id={id} className={cn("scroll-mt-20 py-16 sm:py-20", bg, className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {(eyebrow || title || text) && (
          <div className={cn("mb-10 max-w-3xl", center && "mx-auto text-center")}>
            {eyebrow && <p className={cn("text-sm font-semibold", tone === "navy" ? "text-navy-300" : "text-navy-600")}>{eyebrow}</p>}
            {title && (
              <Heading className={cn("mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl", tone === "navy" ? "text-white" : "text-slate-900")}>{title}</Heading>
            )}
            {text && <p className={cn("mt-3 text-base leading-relaxed text-pretty", tone === "navy" ? "text-navy-200" : "text-slate-600")}>{text}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
