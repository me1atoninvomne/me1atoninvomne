import { z } from "zod";
import { getDb, schema } from "@/server/db/client";
import { api, readJson } from "@/server/http";
import { newId, nowIso } from "@/server/ids";

const Input = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(60).optional(),
  employees: z.string().max(40).optional(),
  process: z.string().max(80).optional(),
  message: z.string().max(2000).optional(),
  consent: z.literal(true),
  website: z.string().max(0).optional(), // honeypot
});

/** Stores a consultation request. No e-mail is sent from this demo installation. */
export const POST = api(async (req) => {
  const data = await readJson(req, Input);
  const db = await getDb();
  await db.insert(schema.leads).values({
    id: newId("lead"),
    createdAt: nowIso(),
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone ?? null,
    employees: data.employees ?? null,
    process: data.process ?? null,
    message: data.message ?? null,
    source: "website",
  });
  return { ok: true };
});
