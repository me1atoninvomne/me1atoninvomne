import type { Metadata } from "next";
import { SettingsView } from "@/components/app/config/settings-view";
import { requireSession } from "@/server/auth/session";
import { getSettingsPage } from "@/server/services/config-queries";

export const metadata: Metadata = { title: "Einstellungen" };

const TABS = ["general", "users", "automation", "roi", "privacy", "demo"] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const s = await requireSession();
  const data = await getSettingsPage(s);
  const sp = await searchParams;
  const tab = TABS.find((t) => t === sp.tab) ?? "general";
  return (
    <SettingsView
      data={data}
      currentUserId={s.user.id}
      initialTab={tab}
      permissions={{
        settings: s.can("settings.edit"),
        users: s.can("users.manage"),
        retention: s.can("retention.apply"),
        reset: s.workspace.isDemo || s.can("workspace.reset"),
      }}
    />
  );
}
