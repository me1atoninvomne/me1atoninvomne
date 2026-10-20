#!/usr/bin/env node
/**
 * Operator tool for data-subject requests (Art. 15–21 GDPR) recorded via /datenschutz/anfrage.
 *
 *   npm run privacy -- list                 open requests with deadline (overdue first)
 *   npm run privacy -- export <email>       all stored contact data + consent history as JSON
 *   npm run privacy -- erase <email>        delete contact requests and their consent records
 *   npm run privacy -- complete <id> [note] mark a request as completed
 *
 * Verify the requester's identity before export or erase. Uses DATABASE_URL like the app.
 */
import { createClient } from "@libsql/client";

const db = createClient({ url: process.env.DATABASE_URL ?? "file:./data/flowpilot.db", authToken: process.env.DATABASE_AUTH_TOKEN });
const [cmd, arg, ...rest] = process.argv.slice(2);
const now = new Date().toISOString();

async function leadsFor(email) {
  const leads = (await db.execute({ sql: "SELECT * FROM leads WHERE email = ?", args: [email.trim().toLowerCase()] })).rows;
  return Promise.all(
    leads.map(async (l) => {
      const { access_token: _secret, ...lead } = l;
      const consents = (await db.execute({ sql: "SELECT purpose, granted, created_at, version, text, lang, source FROM consent_records WHERE subject_type = 'lead' AND subject_id = ? ORDER BY created_at", args: [l.id] })).rows;
      return { lead, consents };
    }),
  );
}

switch (cmd) {
  case "list": {
    const rows = (await db.execute("SELECT id, created_at, due_at, type, name, email, status, result FROM privacy_requests WHERE status = 'open' ORDER BY due_at")).rows;
    if (rows.length === 0) console.log("Keine offenen Anfragen.");
    for (const r of rows) console.log(`${r.due_at < now ? "ÜBERFÄLLIG " : ""}${r.id}  fällig ${r.due_at.slice(0, 10)}  ${r.type}  ${r.name} <${r.email}>${r.result ? `  (${r.result})` : ""}`);
    break;
  }
  case "export": {
    if (!arg) throw new Error("E-Mail-Adresse fehlt");
    console.log(JSON.stringify({ exportedAt: now, email: arg, requests: await leadsFor(arg) }, null, 2));
    break;
  }
  case "erase": {
    if (!arg) throw new Error("E-Mail-Adresse fehlt");
    const found = await leadsFor(arg);
    for (const { lead } of found) {
      await db.execute({ sql: "DELETE FROM consent_records WHERE subject_type = 'lead' AND subject_id = ?", args: [lead.id] });
      await db.execute({ sql: "DELETE FROM leads WHERE id = ?", args: [lead.id] });
    }
    console.log(`${found.length} Kontaktanfrage(n) gelöscht.`);
    break;
  }
  case "complete": {
    if (!arg) throw new Error("Anfrage-ID fehlt");
    const res = await db.execute({ sql: "UPDATE privacy_requests SET status = 'completed', completed_at = ?, result = COALESCE(result || ' | ', '') || ? WHERE id = ?", args: [now, rest.join(" ") || "erledigt", arg] });
    console.log(res.rowsAffected ? "Als erledigt markiert." : "Anfrage nicht gefunden.");
    break;
  }
  default:
    console.log("Verwendung: npm run privacy -- list | export <email> | erase <email> | complete <id> [Notiz]");
}
