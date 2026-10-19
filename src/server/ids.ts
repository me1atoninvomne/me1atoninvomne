import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Random, URL-safe id with prefix, e.g. `doc_k3j9x0q2m1ab`. */
export function newId(prefix: string, length = 12): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `${prefix}_${out}`;
}

export const nowIso = () => new Date().toISOString();
export const todayIso = () => new Date().toISOString().slice(0, 10);
