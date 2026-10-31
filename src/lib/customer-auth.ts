export type CustomerAuthMethod = "phone";
export type DemoCustomer = {
  kind: "demo";
  id: string;
  name: string;
  email: string;
  phone: string;
  method: CustomerAuthMethod;
};

const phoneRules: Record<string, { length: number; trunk: boolean }> = {
  "+66": { length: 9, trunk: true },
  "+65": { length: 8, trunk: false },
  "+1": { length: 10, trunk: false },
  "+44": { length: 10, trunk: true },
};

export function normalizeCustomerPhone(
  country: string,
  input: string,
): string | null {
  const rule = phoneRules[country];
  if (!rule || !/^[+\d\s()-]+$/.test(input.trim())) return null;
  let number = input.replace(/[\s()-]/g, "");
  if (number.startsWith("+")) {
    if (!number.startsWith(country)) return null;
    number = number.slice(country.length);
  }
  if (rule.trunk && number.startsWith("0")) number = number.slice(1);
  if (!new RegExp(`^[1-9]\\d{${rule.length - 1}}$`).test(number)) return null;
  if (country === "+66" && !/^[689]/.test(number)) return null;
  return country + number;
}

export function validateDemoOtp(
  code: string,
  expiresAt: number,
  now = Date.now(),
) {
  if (now >= expiresAt) return "expired";
  return code === "123456" ? null : "invalid";
}

export function isDemoCustomer(value: unknown): value is DemoCustomer {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<DemoCustomer>;
  return (
    profile.kind === "demo" &&
    typeof profile.id === "string" &&
    typeof profile.name === "string" &&
    typeof profile.phone === "string" &&
    typeof profile.email === "string" &&
    profile.method === "phone"
  );
}
