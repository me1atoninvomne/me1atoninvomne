"use client";

import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu as MenuIcon,
  Plug,
  Radar,
  RotateCcw,
  Settings,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { INDUSTRY_KEYS, INDUSTRY_TEMPLATES, type IndustryKey } from "@/domain/templates";
import type { LocalizedText } from "@/domain/types";
import { notificationText } from "@/i18n/audit";
import { useDomain, useFormat, useLang, useT } from "@/i18n/client";
import { commonDict } from "@/i18n/ui/common";
import { shellDict } from "@/i18n/ui/shell";
import { useMutation } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { Button } from "../ui/button";
import { Select } from "../ui/form";
import { Dialog, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "../ui/overlay";
import { Avatar } from "./badges";
import { Logo } from "./logo";

interface ShellUser {
  id: string;
  name: string;
  role: string;
  department: string;
  title: LocalizedText;
}

interface ShellProps {
  workspace: { id: string; name: string; industry: string; isDemo: boolean };
  user: ShellUser;
  users: ShellUser[];
  counts: { inbox: number; review: number; exceptions: number };
  notifications: { items: { id: string; at: string; kind: string; params: Record<string, unknown>; read: boolean; documentId: string | null }[]; unread: number };
  tour: { processed: boolean; reviewed: boolean; exported: boolean };
  children: React.ReactNode;
}

export function AppShell(props: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarContent {...props} />
      </aside>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="fade-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <button className="absolute top-3 right-3 rounded-md p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setMobileOpen(false)} aria-label="Menü schließen">
              <X className="size-5" />
            </button>
            <SidebarContent {...props} />
          </aside>
        </div>
      )}
      <div className="lg:pl-60">
        <Topbar {...props} onMenu={() => setMobileOpen(true)} />
        {props.workspace.isDemo && <DemoBanner industry={props.workspace.industry as IndustryKey} />}
        <main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{props.children}</main>
      </div>
      {props.workspace.isDemo && <TourPanel workspaceId={props.workspace.id} tour={props.tour} />}
    </div>
  );
}

function SidebarContent({ counts }: ShellProps) {
  const t = useT(shellDict);
  const pathname = usePathname();
  const groups: { label: string; items: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; count?: number; alert?: boolean }[] }[] = [
    {
      label: t.nav.groups.work,
      items: [
        { href: "/app", label: t.nav.dashboard, icon: LayoutDashboard },
        { href: "/app/inbox", label: t.nav.inbox, icon: Inbox, count: counts.inbox },
        { href: "/app/review", label: t.nav.review, icon: ClipboardCheck, count: counts.review },
        { href: "/app/tasks", label: t.nav.tasks, icon: ListChecks },
        { href: "/app/exceptions", label: t.nav.exceptions, icon: Radar, count: counts.exceptions, alert: counts.exceptions > 0 },
      ],
    },
    {
      label: t.nav.groups.automation,
      items: [
        { href: "/app/workflows", label: t.nav.workflows, icon: Workflow },
        { href: "/app/integrations", label: t.nav.integrations, icon: Plug },
      ],
    },
    {
      label: t.nav.groups.insights,
      items: [
        { href: "/app/roi", label: t.nav.roi, icon: BarChart3 },
        { href: "/app/pilot", label: t.nav.pilot, icon: FlaskConical },
        { href: "/app/audit", label: t.nav.audit, icon: Activity },
      ],
    },
    { label: t.nav.groups.admin, items: [{ href: "/app/settings", label: t.nav.settings, icon: Settings }] },
  ];
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  return (
    <>
      <div className="flex h-14 shrink-0 items-center border-b border-slate-100 px-4">
        <Link href="/app" aria-label="FlowPilot AI">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Hauptnavigation">
        {groups.map((g) => (
          <div key={g.label} className="mb-5">
            <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                        active ? "bg-navy-50 text-navy-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", active ? "text-navy-700" : "text-slate-400 group-hover:text-slate-600")} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.count != null && item.count > 0 && (
                        <span
                          className={cn(
                            "tabular rounded-full px-1.5 text-[11px] font-semibold",
                            item.alert ? "bg-red-100 text-red-700" : active ? "bg-navy-100 text-navy-800" : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {item.count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3 text-xs text-slate-500">
        <p className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-violet-500" />
          <span>Demo-Adapter aktiv</span>
        </p>
        <Link href="/" className="mt-1 inline-flex items-center gap-1 text-slate-500 hover:text-slate-800">
          <LogOut className="size-3.5" /> {t.leaveDemo}
        </Link>
      </div>
    </>
  );
}

function Topbar({ workspace, user, users, notifications, onMenu }: ShellProps & { onMenu: () => void }) {
  const c = useT(commonDict);
  const d = useDomain();
  const lang = useLang();
  const f = useFormat();
  const router = useRouter();
  const { run, pending } = useMutation();
  const [dialog, setDialog] = useState<null | "reset" | "industry">(null);
  const [industry, setIndustry] = useState<IndustryKey>(workspace.industry as IndustryKey);

  const setLang = async (l: "de" | "en") => {
    await run("/api/session/lang", { body: { lang: l } }, { silent: false });
  };
  const switchUser = async (id: string) => {
    await run("/api/session/user", { body: { userId: id } });
  };
  const reset = async (target?: IndustryKey) => {
    await run("/api/demo/reset", { body: target ? { industry: target } : {} }, { success: c.resetDemo });
    setDialog(null);
    router.push("/app/inbox?tour=1");
  };
  const markRead = () => run("/api/notifications/read", { body: {} }, { silent: true });

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button className="-ml-1 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={onMenu} aria-label={c.menu}>
        <MenuIcon className="size-5" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Building2 className="hidden size-4 shrink-0 text-slate-400 sm:block" />
        <span className="truncate text-sm font-medium text-slate-800">{workspace.name}</span>
        {workspace.isDemo && (
          <span className="hidden shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 sm:inline">{c.demoBadge}</span>
        )}
        <span className="hidden shrink-0 text-sm text-slate-400 md:inline">·</span>
        <button onClick={() => setDialog("industry")} className="hidden shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:inline-flex">
          {INDUSTRY_TEMPLATES[workspace.industry as IndustryKey]?.name[lang]}
          <ChevronDown className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-xs font-semibold" role="group" aria-label={c.language}>
        {(["de", "en"] as const).map((l) => (
          <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={cn("rounded-md px-2 py-1", lang === l ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <Menu onOpenChange={(open) => !open && notifications.unread > 0 && markRead()}>
        <MenuTrigger asChild>
          <button className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label={c.notifications}>
            <Bell className="size-[18px]" />
            {notifications.unread > 0 && (
              <span className="tabular absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-4 font-semibold text-white">
                {notifications.unread > 9 ? "9+" : notifications.unread}
              </span>
            )}
          </button>
        </MenuTrigger>
        <MenuContent className="w-[min(92vw,380px)]">
          <MenuLabel>
            {c.notifications} · {c.inApp}
          </MenuLabel>
          {notifications.items.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-500">{c.noNotifications}</p>}
          <div className="max-h-96 overflow-y-auto">
            {notifications.items.map((n) => (
              <MenuItem key={n.id} onSelect={() => n.documentId && router.push(`/app/documents/${n.documentId}`)} className="items-start">
                <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-blue-600")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] leading-snug text-slate-800">{notificationText(n.kind, n.params, lang, f)}</span>
                  <span className="text-xs text-slate-400">{f.relative(n.at)}</span>
                </span>
              </MenuItem>
            ))}
          </div>
        </MenuContent>
      </Menu>

      <Menu>
        <MenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md py-1 pr-1 pl-1 text-left hover:bg-slate-100 sm:pr-2" aria-label={c.switchUser}>
            <Avatar name={user.name} />
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-36 truncate text-[13px] leading-tight font-medium text-slate-800">{user.name}</span>
              <span className="block max-w-36 truncate text-[11px] leading-tight text-slate-500">{d.role[user.role as keyof typeof d.role]}</span>
            </span>
            <ChevronDown className="hidden size-3.5 text-slate-400 sm:block" />
          </button>
        </MenuTrigger>
        <MenuContent className="w-72">
          <MenuLabel>{c.switchUser}</MenuLabel>
          <p className="px-2.5 pb-1.5 text-xs leading-snug text-slate-500">{c.switchUserHint}</p>
          {users.map((u) => (
            <MenuItem key={u.id} onSelect={() => u.id !== user.id && switchUser(u.id)} disabled={pending}>
              <Avatar name={u.name} className="size-6 text-[10px]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-800">{u.name}</span>
                <span className="block truncate text-[11px] text-slate-500">
                  {d.role[u.role as keyof typeof d.role]} · {u.title[lang]}
                </span>
              </span>
              {u.id === user.id && <Check className="size-4 text-navy-700" />}
            </MenuItem>
          ))}
          {workspace.isDemo && (
            <>
              <MenuSeparator />
              <MenuItem onSelect={() => setDialog("industry")}>
                <Building2 className="size-4 text-slate-400" /> {c.changeIndustry}
              </MenuItem>
              <MenuItem onSelect={() => setDialog("reset")}>
                <RotateCcw className="size-4 text-slate-400" /> {c.resetDemo}
              </MenuItem>
            </>
          )}
        </MenuContent>
      </Menu>

      <Dialog
        open={dialog === "reset"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={c.resetDemo}
        description={c.resetDemoConfirm}
        size="sm"
        footer={
          <>
            <Button onClick={() => setDialog(null)}>{c.cancel}</Button>
            <Button variant="primary" loading={pending} onClick={() => reset()} icon={<RotateCcw className="size-4" />}>
              {c.reset}
            </Button>
          </>
        }
      />
      <Dialog
        open={dialog === "industry"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={c.changeIndustry}
        description={c.changeIndustryConfirm}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>{c.cancel}</Button>
            <Button variant="primary" loading={pending} onClick={() => reset(industry)}>
              {c.confirm}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Select value={industry} onChange={(e) => setIndustry(e.target.value as IndustryKey)} aria-label={c.industry}>
            {INDUSTRY_KEYS.map((k) => (
              <option key={k} value={k}>
                {INDUSTRY_TEMPLATES[k].name[lang]}
              </option>
            ))}
          </Select>
          <p className="text-sm text-slate-600">{INDUSTRY_TEMPLATES[industry].focus[lang]}</p>
          <ul className="space-y-1 text-sm text-slate-600">
            {INDUSTRY_TEMPLATES[industry].process.map((p) => (
              <li key={p.de} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                {p[lang]}
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </header>
  );
}

function DemoBanner({ industry }: { industry: IndustryKey }) {
  const t = useT(shellDict);
  const lang = useLang();
  return (
    <div className="no-print border-b border-amber-200/70 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900 sm:px-6">
      <span className="hidden sm:inline">{t.demoBanner}</span>
      <span className="sm:hidden">{t.demoBannerShort}</span>
      <span className="hidden text-amber-700 md:inline"> · {INDUSTRY_TEMPLATES[industry]?.audience[lang]}</span>
    </div>
  );
}

function TourPanel({ workspaceId, tour }: { workspaceId: string; tour: ShellProps["tour"] }) {
  const t = useT(shellDict);
  const pathname = usePathname();
  const key = `fp-tour-${workspaceId}`;
  const [state, setState] = useState<{ open: boolean; visited: string[] }>({ open: true, visited: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setState(JSON.parse(raw));
      else if (window.innerWidth < 768) setState((s) => ({ ...s, open: false }));
    } catch {
      /* storage unavailable – keep defaults */
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    const page = pathname.startsWith("/app/exceptions") ? "exceptions" : pathname.startsWith("/app/roi") ? "roi" : null;
    if (page && !state.visited.includes(page)) setState((s) => ({ ...s, visited: [...s.visited, page] }));
  }, [pathname, state.visited]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, key, ready]);

  const done: Record<string, boolean> = {
    process: tour.processed,
    review: tour.reviewed,
    export: tour.exported,
    exceptions: state.visited.includes("exceptions"),
    roi: state.visited.includes("roi"),
  };
  const completed = Object.values(done).filter(Boolean).length;
  if (!ready) return null;

  if (!state.open) {
    return (
      <button
        onClick={() => setState((s) => ({ ...s, open: true }))}
        className="no-print fixed right-4 bottom-4 z-30 flex items-center gap-2 rounded-full bg-navy-900 px-3.5 py-2 text-sm font-medium text-white shadow-[var(--shadow-pop)] hover:bg-navy-800"
      >
        <Sparkles className="size-4" />
        {t.tour.show}
        <span className="tabular rounded-full bg-white/15 px-1.5 text-xs">
          {completed}/5
        </span>
      </button>
    );
  }
  const nextIndex = t.tour.steps.findIndex((s) => !done[s.key]);
  return (
    <div className="no-print fade-in fixed right-4 bottom-4 z-30 w-[min(92vw,320px)] rounded-xl bg-white shadow-[var(--shadow-pop)] ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{t.tour.title}</p>
          <p className="text-xs text-slate-500">
            {t.tour.subtitle} · {completed}/5 {t.tour.done}
          </p>
        </div>
        <button onClick={() => setState((s) => ({ ...s, open: false }))} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={t.tour.hide}>
          <X className="size-4" />
        </button>
      </div>
      <ol className="space-y-0.5 p-2">
        {t.tour.steps.map((step, i) => {
          const isDone = done[step.key];
          const isNext = i === nextIndex;
          return (
            <li key={step.key}>
              <Link href={step.href} className={cn("flex gap-3 rounded-lg px-2 py-2", isNext ? "bg-navy-50" : "hover:bg-slate-50")}>
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    isDone ? "bg-emerald-600 text-white" : isNext ? "pulse-ring bg-navy-800 text-white" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {isDone ? <Check className="size-3" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-[13px] font-medium", isDone ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900")}>{step.title}</span>
                  {isNext && <span className="block text-xs leading-snug text-slate-500">{step.text}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
