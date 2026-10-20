import type { Metadata } from "next";
import type { Lang } from "@/i18n/core";
import { legalContext, legalTextsReviewed } from "@/legal/context";
import type { LegalContext, LegalDocFactory } from "@/legal/types";
import { getLang } from "@/server/auth/session";
import { LegalPage } from "./legal-page";

/**
 * Builds `generateMetadata` and the page component for a legal document route:
 *
 *   const route = legalRoute(privacyDoc, LEGAL_VERSIONS.privacy);
 *   export const generateMetadata = route.generateMetadata;
 *   export default route.Page;
 */
export function legalRoute(
  docs: Record<Lang, LegalDocFactory>,
  version: string,
  extra?: (ctx: LegalContext) => React.ReactNode,
) {
  async function generateMetadata(): Promise<Metadata> {
    const lang = await getLang();
    return { title: docs[lang](legalContext(lang)).title };
  }

  async function Page() {
    const lang = await getLang();
    const ctx = legalContext(lang);
    return (
      <LegalPage doc={docs[lang](ctx)} lang={lang} version={version} reviewed={legalTextsReviewed()} companyConfigured={ctx.company.configured}>
        {extra?.(ctx)}
      </LegalPage>
    );
  }

  return { generateMetadata, Page };
}
