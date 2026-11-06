export function commissionFromPercent(value: string) {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, decimal = ""] = value.trim().split(".");
  const bps = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return bps <= 10000 ? bps : null;
}

export function splitRental(rentalSatang: number, commissionBps: number) {
  if (
    !Number.isSafeInteger(rentalSatang) ||
    rentalSatang < 0 ||
    !Number.isInteger(commissionBps) ||
    commissionBps < 0 ||
    commissionBps > 10000
  )
    throw new Error("Invalid commission calculation");
  const company = Number(
    (BigInt(rentalSatang) * BigInt(commissionBps)) / BigInt(10000),
  );
  return { company, partner: rentalSatang - company };
}

export function formatBaht(value: string | number | null, locale = "th") {
  if (value === null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(Number(value) / 100);
}

export function financePeriod(value: unknown, now = new Date()) {
  const period = value === "all" || value === "30d" ? value : "month";
  // Calendar boundaries are Bangkok time, independent of the server timezone.
  const bangkok = new Date(now.getTime() + 7 * 3600000);
  const from =
    period === "all"
      ? new Date(0)
      : period === "30d"
        ? new Date(now.getTime() - 30 * 86400000)
        : new Date(
            Date.UTC(bangkok.getUTCFullYear(), bangkok.getUTCMonth(), 1) -
              7 * 3600000,
          );
  return { period, from };
}
