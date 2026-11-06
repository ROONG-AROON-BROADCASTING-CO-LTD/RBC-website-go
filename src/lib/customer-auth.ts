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
