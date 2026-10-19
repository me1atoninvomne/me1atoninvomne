import { FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { commonDict } from "@/i18n/ui/common";
import { getLang } from "@/server/auth/session";

export default async function NotFound() {
  const c = commonDict[await getLang()];
  return (
    <Card className="mx-auto mt-10 max-w-lg px-6 py-10 text-center" as="div">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <FileQuestion className="size-5" />
      </div>
      <h1 className="text-base font-semibold text-slate-900">{c.notFoundTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">{c.notFoundText}</p>
      <div className="mt-5">
        <ButtonLink href="/app" variant="primary">
          {c.back}
        </ButtonLink>
      </div>
    </Card>
  );
}
