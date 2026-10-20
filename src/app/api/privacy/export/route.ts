import { notFound } from "@/server/errors";
import { api } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { exportLead } from "@/server/services/privacy";

/** Machine-readable copy of all data stored for a contact request (Art. 15 / Art. 20 GDPR). */
export const GET = api(async (req) => {
  rateLimit(req, "privacy", 60, 60 * 60 * 1000);
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const data = await exportLead(token);
  if (!data) throw notFound("lead");
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="flowpilot-meine-daten.json"',
      "Cache-Control": "no-store",
    },
  });
});
