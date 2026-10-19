import "server-only";
import { ZodError, type ZodType } from "zod";
import { AppError } from "./errors";

export type RouteParams<T extends Record<string, string>> = { params: Promise<T> };

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json({ error: { code: error.code, params: error.params } }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: { code: "invalid_input", issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } }, { status: 400 });
  }
  console.error("[api] unexpected error", error);
  return Response.json({ error: { code: "internal" } }, { status: 500 });
}

/** Wraps a route handler: JSON result, typed errors, no stack traces leaked to the client. */
export function api<C>(fn: (req: Request, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      const result = await fn(req, ctx);
      if (result instanceof Response) return result;
      return Response.json(result ?? { ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError("invalid_json", 400);
  }
  return schema.parse(body);
}

/** Excel-friendly CSV for German locale: semicolon separator, UTF-8 BOM, CRLF. */
export function csvResponse(fileName: string, header: string[], rows: (string | number | null | undefined)[][]): Response {
  const esc = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = typeof v === "number" ? String(v).replace(".", ",") : v;
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = "﻿" + [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "no-store" },
  });
}
