import type { Locale } from "./domain";

export type StaffRole = "admin" | "reviewer" | "support";

export function staffLocale(value: unknown): Locale {
  return value === "en" || value === "zh" ? value : "th";
}

export function staffLoginPath(locale: string) {
  const language = staffLocale(locale);
  return language === "th" ? "/admin" : `/admin?lang=${language}`;
}

export function staffWorkspacePath(role: StaffRole, locale: string) {
  return `/${staffLocale(locale)}/operations/${role === "support" ? "payments" : role === "reviewer" ? "partners" : "overview"}`;
}
