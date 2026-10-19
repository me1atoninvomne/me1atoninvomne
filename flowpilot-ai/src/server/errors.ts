/** Errors that are safe to show to the user. `code` maps to a localized message in the UI. */
export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly status = 400,
    readonly params: Record<string, string | number> = {},
    message?: string,
  ) {
    super(message ?? code);
  }
}

export const notFound = (what = "resource") => new AppError("not_found", 404, { what });
export const forbidden = (permission: string) => new AppError("forbidden", 403, { permission });
export const unauthorized = () => new AppError("no_session", 401);
