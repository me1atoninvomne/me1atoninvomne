/**
 * Session handling for demo workspaces.
 *
 * Demo mode: an unguessable workspace id in an httpOnly cookie identifies the visitor's isolated
 * workspace; a second cookie selects the demo user (to demonstrate roles). In production this is
 * replaced by SSO (e.g. Microsoft Entra ID via OIDC) – the permission checks stay the same.
 */
import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { can, type Permission } from "@/domain/permissions";
import type { Role } from "@/domain/types";
import { DEFAULT_LANG, isLang, LANG_COOKIE, type Lang } from "@/i18n/core";
import { getDb, schema } from "@/server/db/client";
import { forbidden, unauthorized } from "@/server/errors";

export const WS_COOKIE = "fp_ws";
export const USER_COOKIE = "fp_user";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type Workspace = typeof schema.workspaces.$inferSelect;
export type User = typeof schema.users.$inferSelect;

export interface Session {
  workspace: Workspace;
  user: User;
  users: User[];
  lang: Lang;
  can: (p: Permission) => boolean;
  require: (p: Permission) => void;
}

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const v = store.get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const wsId = store.get(WS_COOKIE)?.value;
  if (!wsId) return null;
  const db = await getDb();
  const workspace = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, wsId) });
  if (!workspace) return null;
  const users = await db.query.users.findMany({ where: eq(schema.users.workspaceId, workspace.id) });
  const userId = store.get(USER_COOKIE)?.value;
  const user = users.find((u) => u.id === userId && u.active) ?? users.find((u) => u.role === "manager") ?? users[0];
  if (!user) return null;
  const lang = await getLang();
  return {
    workspace,
    user,
    users,
    lang,
    can: (p) => can(user.role as Role, p),
    require: (p) => {
      if (!can(user.role as Role, p)) throw forbidden(p);
    },
  };
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw unauthorized();
  return s;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function findUser(workspaceId: string, userId: string): Promise<User | undefined> {
  const db = await getDb();
  return db.query.users.findFirst({ where: and(eq(schema.users.workspaceId, workspaceId), eq(schema.users.id, userId)) });
}
