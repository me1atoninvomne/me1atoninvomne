import { cookies } from "next/headers";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";
import { SkipLink } from "@/components/ui/skip-link";
import { getLang, WS_COOKIE } from "@/server/auth/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const hasDemo = Boolean((await cookies()).get(WS_COOKIE)?.value);
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SkipLink />
      <MarketingHeader hasDemo={hasDemo} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <MarketingFooter lang={lang} />
    </div>
  );
}
