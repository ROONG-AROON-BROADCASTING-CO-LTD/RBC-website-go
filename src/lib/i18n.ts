import shared from "./translations/th/shared.json";
import home from "./translations/th/home.json";
import search from "./translations/th/search.json";
import vehicle from "./translations/th/vehicle.json";
import booking from "./translations/th/booking.json";
import account from "./translations/th/account.json";
import partner from "./translations/th/partner.json";
import operations from "./translations/th/operations.json";
import experiences from "./translations/th/experiences.json";
import guide from "./translations/th/guide.json";
import catalog from "./translations/th/catalog.json";
import legacy from "./translations/th/legacy.json";
import zhShared from "./translations/zh/shared.json";
import zhHome from "./translations/zh/home.json";
import zhSearch from "./translations/zh/search.json";
import zhVehicle from "./translations/zh/vehicle.json";
import zhBooking from "./translations/zh/booking.json";
import zhAccount from "./translations/zh/account.json";
import zhExperiences from "./translations/zh/experiences.json";
import zhCatalog from "./translations/zh/catalog.json";
import type { Locale } from "./domain";

// Keep the public translate() API stable while editing copy in page-specific files.
const dictionary: Record<string, string> = {
  ...shared,
  ...home,
  ...search,
  ...vehicle,
  ...booking,
  ...account,
  ...partner,
  ...operations,
  ...experiences,
  ...guide,
  ...catalog,
  ...legacy,
};

const chineseDictionary: Record<string, string> = {
  ...zhShared,
  ...zhHome,
  ...zhSearch,
  ...zhVehicle,
  ...zhBooking,
  ...zhAccount,
  ...zhExperiences,
  ...zhCatalog,
};

export function translate(locale: Locale, text: string): string {
  if (locale === "en") return text;
  const key = text.replace(/\s+/g, " ").trim();
  const translated = (locale === "zh" ? chineseDictionary : dictionary)[key];
  if (translated) return translated;
  const parts = key.split(" · ");
  if (parts.length > 1)
    return parts.map((p) => translate(locale, p)).join(" · ");
  const units: Record<string, string> =
    locale === "zh"
      ? {
          day: "天",
          days: "天",
          trip: "次行程",
          charter: "次包租",
          guests: "人",
          seats: "座",
          hour: "小时",
        }
      : {
          day: "วัน",
          days: "วัน",
          trip: "ทริป",
          charter: "เหมาลำ",
          guests: "คน",
          seats: "ที่นั่ง",
          hour: "ชั่วโมง",
        };
  const count = key.match(/^(\d+) (days?|trip|charter|guests|seats|hour)$/);
  if (count) return `${count[1]} ${units[count[2]]}`;
  return key;
}
export const formatDate = (locale: Locale, date: string) =>
  new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(new Date(`${date}T12:00:00`));
export const money = (amount: number, currency: "THB" | "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
    .format(currency === "USD" ? amount / 35 : amount)
    .replace("THB", "฿");
