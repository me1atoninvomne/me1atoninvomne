import { getDb } from "@/server/db/client";

export async function GET() {
  try {
    await getDb();
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
