import { requireSession } from "@/server/auth/session";
import { api } from "@/server/http";
import { simulateIncomingEmail } from "@/server/services/processing";

export const POST = api(async () => simulateIncomingEmail(await requireSession()));
