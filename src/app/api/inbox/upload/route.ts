import { requireSession } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { api } from "@/server/http";
import { MAX_UPLOAD_BYTES, uploadDocument } from "@/server/services/processing";

export const POST = api(async (req) => {
  const s = await requireSession();
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) throw new AppError("upload_too_large", 413, { maxMb: MAX_UPLOAD_BYTES / 1024 / 1024 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") throw new AppError("upload_empty");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return uploadDocument(s, { name: file.name || "upload.pdf", type: file.type, bytes });
});
