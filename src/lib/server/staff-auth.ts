import { cache } from "react";
import { AuthError, authenticateEmail, currentAccount } from "./auth";
import { getDb } from "./db";
import type { StaffRole } from "../staff-navigation";

export async function staffMembership(accountId: string) {
  const sql = getDb();
  const [staff] = await sql<{ role: StaffRole }[]>`
    select role from rbc_go.staff_members where account_id = ${accountId}
      and role in ('admin', 'reviewer', 'support')
  `;
  return staff ?? null;
}

export async function authenticateStaff(email: string, password: string) {
  const accountId = await authenticateEmail(email, password);
  const staff = await staffMembership(accountId);
  if (!staff) throw new AuthError("staff_access_required");
  return { id: accountId, role: staff.role };
}

export const currentStaff = cache(async () => {
  if (!process.env.DATABASE_URL) return null;
  const account = await currentAccount();
  if (!account) return null;
  const staff = await staffMembership(account.id);
  return staff ? { ...account, role: staff.role } : null;
});
