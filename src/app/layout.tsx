import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { TooltipProvider } from "@/components/ui/overlay";
import { ToastProvider } from "@/components/ui/toast";
import { LangProvider } from "@/i18n/client";
import { getLang } from "@/server/auth/session";

export const metadata: Metadata = {
  title: {
    default: "FlowPilot AI – Auftrags- und Dokumentenprozesse automatisieren",
    template: "%s · FlowPilot AI",
  },
  description:
    "FlowPilot AI liest Bestellungen, Rechnungen und Auftragsbestätigungen aus Ihrem Postfach, prüft sie gegen Ihre Stammdaten und legt nur die Fälle vor, die wirklich einen Menschen brauchen.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#172a47",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <body className="min-h-dvh">
        <LangProvider lang={lang}>
          <TooltipProvider>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </LangProvider>
      </body>
    </html>
  );
}
