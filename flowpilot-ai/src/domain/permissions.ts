import type { Role } from "./types";

export const PERMISSIONS = [
  "inbox.read",
  "inbox.process",
  "documents.edit",
  "documents.approve",
  "documents.approve_financial",
  "documents.approve_over_limit",
  "documents.accept_critical",
  "documents.reject",
  "documents.handover",
  "documents.export",
  "tasks.manage",
  "workflows.edit",
  "rules.edit",
  "settings.edit",
  "users.manage",
  "audit.read",
  "audit.export",
  "retention.apply",
  "workspace.reset",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const CLERK: Permission[] = [
  "inbox.read",
  "inbox.process",
  "documents.edit",
  "documents.approve",
  "documents.approve_financial",
  "documents.reject",
  "documents.handover",
  "documents.export",
  "tasks.manage",
  "audit.read",
];

const MANAGER: Permission[] = [
  ...CLERK,
  "documents.approve_over_limit",
  "documents.accept_critical",
  "workflows.edit",
  "rules.edit",
  "settings.edit",
  "audit.export",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: ["inbox.read", "audit.read"],
  clerk: CLERK,
  manager: MANAGER,
  admin: [...PERMISSIONS],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
