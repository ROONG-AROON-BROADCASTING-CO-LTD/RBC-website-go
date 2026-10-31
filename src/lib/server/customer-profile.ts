import type { Traveler } from "@/lib/domain";
import { getDb } from "./db";

export class CustomerProfileError extends Error {
  constructor() {
    super("invalid_profile");
  }
}

export async function saveCustomerProfileRecord(
  accountId: string,
  traveler: Traveler,
) {
  const name = traveler.name.trim();
  const email = traveler.email.trim().toLowerCase();
  const phone = traveler.phone.trim();
  if (
    !name ||
    name.length > 120 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    phone.length > 32 ||
    phone.replace(/\D/g, "").length < 8
  ) {
    throw new CustomerProfileError();
  }
  const sql = getDb();
  await sql`
    insert into rbc_go.customer_profiles
      (account_id, full_name, contact_email, contact_phone)
    values (${accountId}, ${name}, ${email}, ${phone})
    on conflict (account_id) do update
      set full_name = excluded.full_name,
          contact_email = excluded.contact_email,
          contact_phone = excluded.contact_phone,
          updated_at = now()
  `;
}
