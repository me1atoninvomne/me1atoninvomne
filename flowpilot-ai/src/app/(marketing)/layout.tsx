import { cookies } from "next/headers";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";
import { getLang, WS_COOKIE } from "@/server/auth/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const hasDemo = Boolean((await cookies()).get(WS_COOKIE)?.value);
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <MarketingHeader hasDemo={hasDemo} />
      <main className="flex-1">{children}</main>
      <MarketingFooter lang={lang} />
    </div>
  );
}
