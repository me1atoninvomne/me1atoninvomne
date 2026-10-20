import { COMPANY_ENV, missingCompanyFields } from "@/config/company";
import { getDb } from "@/server/db/client";

export async function GET() {
  // Operator details for imprint and privacy policy are reported so a deployment check can flag them.
  const legal = { companyDetailsComplete: missingCompanyFields().length === 0, missing: missingCompanyFields().map((f) => COMPANY_ENV[f]) };
  try {
    await getDb();
    return Response.json({ status: "ok", legal });
  } catch {
    return Response.json({ status: "error", legal }, { status: 503 });
  }
}
