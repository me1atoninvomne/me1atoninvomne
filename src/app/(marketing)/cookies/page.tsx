import { Settings2 } from "lucide-react";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import { legalRoute } from "@/components/legal/legal-route";
import { legalDict } from "@/i18n/ui/legal";
import { cookiesDoc } from "@/legal/content/cookies";
import { LEGAL_VERSIONS } from "@/legal/versions";

const route = legalRoute(cookiesDoc, LEGAL_VERSIONS.cookies, (ctx) => (
  <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
    <p className="text-sm text-slate-700">{legalDict[ctx.lang].banner.dialogText}</p>
    <CookieSettingsButton className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-navy-800">
      <Settings2 className="size-4" aria-hidden />
      {legalDict[ctx.lang].footer.cookieSettings}
    </CookieSettingsButton>
  </div>
));
export const generateMetadata = route.generateMetadata;
export default route.Page;
