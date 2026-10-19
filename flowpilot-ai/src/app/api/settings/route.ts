import { requireSession } from "@/server/auth/session";
import { api, readJson } from "@/server/http";
import { SettingsUpdateSchema, updateSettings } from "@/server/services/config";

export const PATCH = api(async (req) => updateSettings(await requireSession(), await readJson(req, SettingsUpdateSchema)));
