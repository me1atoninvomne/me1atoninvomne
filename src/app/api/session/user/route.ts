import { cookies } from "next/headers";
import { z } from "zod";
import { requireSession, sessionCookieOptions, USER_COOKIE } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { api, readJson } from "@/server/http";
import { audit } from "@/server/services/audit";

const Input = z.object({ userId: z.string().max(64) });

/** Demo only: switch between synthetic users to experience roles and permissions. */
export const POST = api(async (req) => {
  const s = await requireSession();
  if (!s.workspace.isDemo) throw new AppError("forbidden", 403);
  const { userId } = await readJson(req, Input);
  const target = s.users.find((u) => u.id === userId && u.active);
  if (!target) throw new AppError("invalid_assignee", 400);
  (await cookies()).set(USER_COOKIE, target.id, sessionCookieOptions());
  await audit(await getDb(), {
    workspaceId: s.workspace.id,
    actorType: "user",
    actorId: target.id,
    actorName: target.name,
    action: "session.user_switched",
    entityType: "user",
    entityId: target.id,
    params: { name: target.name, role: target.role },
  });
  return { ok: true };
});
