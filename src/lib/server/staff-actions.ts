"use server";

import { redirect } from "next/navigation";
import { AuthError, createSession, signOut } from "./auth";
import { authenticateStaff } from "./staff-auth";
import {
  staffLocale,
  staffLoginPath,
  staffWorkspacePath,
} from "../staff-navigation";

export async function loginStaff(
  _previous: { error: string },
  form: FormData,
): Promise<{ error: string }> {
  if (!process.env.DATABASE_URL) return { error: "service_unavailable" };
  const locale = staffLocale(form.get("locale"));
  let destination: string;
  try {
    const staff = await authenticateStaff(
      String(form.get("email") ?? ""),
      String(form.get("password") ?? ""),
    );
    // Check staff membership before replacing any existing browser session.
    await createSession(staff.id);
    destination = staffWorkspacePath(staff.role, locale);
  } catch (error) {
    return {
      error: error instanceof AuthError ? error.code : "service_unavailable",
    };
  }
  redirect(destination);
}

export async function logoutStaff(form: FormData) {
  await signOut();
  redirect(staffLoginPath(staffLocale(form.get("locale"))));
}
