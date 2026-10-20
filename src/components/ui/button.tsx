import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./feedback";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "accent";
type Size = "xs" | "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950 shadow-sm disabled:bg-navy-300",
  accent: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm disabled:bg-blue-300",
  secondary: "bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 active:bg-slate-100 shadow-sm disabled:text-slate-400",
  ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:text-slate-400",
  danger: "bg-white text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-50 active:bg-red-100 disabled:text-red-300",
  success: "bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900 shadow-sm disabled:bg-emerald-300",
};

const SIZE: Record<Size, string> = {
  xs: "h-7 px-2 text-xs gap-1 rounded-md",
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-3.5" /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: { href: string; variant?: Variant; size?: Size; icon?: React.ReactNode; className?: string; children?: React.ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  const cls = cn("inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors", VARIANT[variant], SIZE[size], className);
  // API routes and downloads are plain links: Next's <Link> would prefetch them in production,
  // which would run the export (and log it) without the user clicking.
  if (href.startsWith("/api/") || rest.download != null) {
    return (
      <a href={href} className={cls} {...rest}>
        {icon}
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
