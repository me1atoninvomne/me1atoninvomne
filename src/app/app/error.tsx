"use client";

import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n/client";
import { commonDict } from "@/i18n/ui/common";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const c = useT(commonDict);
  return (
    <Card className="mx-auto mt-10 max-w-lg px-6 py-10 text-center" as="div">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertOctagon className="size-5" />
      </div>
      <h1 className="text-base font-semibold text-slate-900">{c.errorTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">{c.errorText}</p>
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={reset} icon={<RotateCcw className="size-4" />}>
          {c.retry}
        </Button>
        <ButtonLink href="/app" variant="primary">
          {c.back}
        </ButtonLink>
      </div>
    </Card>
  );
}
