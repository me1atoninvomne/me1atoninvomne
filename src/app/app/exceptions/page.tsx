import type { Metadata } from "next";
import { ExceptionRadar } from "@/components/app/ops/exception-radar";
import { requireSession } from "@/server/auth/session";
import { getExceptions } from "@/server/services/queries";

export const metadata: Metadata = { title: "Exception Radar" };

export default async function ExceptionsPage() {
  const s = await requireSession();
  const items = await getExceptions(s);
  return <ExceptionRadar items={items} />;
}
