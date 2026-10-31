import inventory from "./inventory.json";
import { selectedPackages } from "./booking-packages";
import type { DemoCustomer } from "./customer-auth";

export type Locale = "th" | "en" | "zh";
export type Category = "boats" | "motorcycles" | "cars" | "jets";
export type Vehicle = (typeof inventory.vehicles)[number];
export const vehicles = inventory.vehicles;
export const categories = inventory.categories;
export const vehicleById = (id?: string) => vehicles.find((v) => v.id === id);
export function searchCategoryForPath(
  pathname: string,
  fallback: Category,
): Category {
  const [, route, id] = pathname.split("/").filter(Boolean);
  if (route === "search" && categories.some((item) => item.id === id))
    return id as Category;
  if (["vehicle", "checkout", "request"].includes(route))
    return (vehicleById(id)?.cat as Category | undefined) ?? fallback;
  return fallback;
}
export type Search = {
  category: Category;
  location: string;
  destination: string;
  date: string;
  returnDate: string;
  time: string;
  returnTime: string;
  guests: number;
  duration: string;
  drive: string;
  flight: string;
  extra: boolean;
  packages?: string[];
};
export type Traveler = { name: string; email: string; phone: string };
export type Quote = {
  id: string;
  vehicleId: string;
  status:
    "Request Submitted" | "Under Review" | "Quote Ready" | "Awaiting Payment";
  requirements: string;
  expiresAt?: number;
  rental?: number;
  availability: boolean;
  search: Search;
  traveler: Traveler;
};
export type Booking = {
  id: string;
  token: string;
  quoteId?: string;
  vehicleId: string;
  search: Search;
  traveler: Traveler;
  total: number;
  deposit: number;
  status: "Confirmed" | "Awaiting confirmation" | "Completed" | "Cancelled";
  payment: "Paid" | "Refund review" | "Refund processing" | "Refunded";
  paymentMethod?: "Card" | "PromptPay";
  createdAt: string;
  handover: boolean;
};
export type Listing = {
  category: Category;
  name: string;
  capacity: number;
  photos: string[];
  location: string;
  price: number;
  service: string;
  policy: string;
  status: "Draft" | "Pending approval" | "Changes requested" | "Approved";
  feedback?: string;
};
export type AppState = {
  customer?: DemoCustomer | null;
  search: Search;
  traveler: Traveler;
  saved: string[];
  bookings: Booking[];
  quote: Quote | null;
  currency: "THB" | "USD";
  partner: {
    business: string;
    email: string;
    documents: string[];
    status:
      "Not submitted" | "Pending approval" | "Changes requested" | "Approved";
    feedback?: string;
    listing: Listing | null;
    blocked: string[];
  };
  messages: { id: string; text: string; at: string }[];
  activity: string[];
  fleet: "Available" | "Maintenance";
  payout: "Pending" | "Paid";
  serviceRequest: "Pending" | "Accepted" | "Declined";
};
export const initialSearch: Search = {
  category: "boats",
  location: "Phuket",
  destination: "Phuket (HKT)",
  date: "2026-11-15",
  returnDate: "2026-11-16",
  time: "09:00",
  returnTime: "09:00",
  guests: 4,
  duration: "Full day",
  drive: "Self-drive",
  flight: "One-way",
  extra: false,
};
export const initialState: AppState = {
  search: initialSearch,
  traveler: { name: "", email: "", phone: "" },
  saved: [],
  bookings: [],
  quote: null,
  currency: "THB",
  partner: {
    business: "",
    email: "",
    documents: [],
    status: "Not submitted",
    listing: null,
    blocked: ["2026-11-18", "2026-11-19"],
  },
  messages: [],
  activity: [],
  fleet: "Available",
  payout: "Pending",
  serviceRequest: "Pending",
};

export function validateDates(search: Search, category: string): boolean {
  const start = new Date(`${search.date}T${search.time}`);
  const end = new Date(`${search.returnDate}T${search.returnTime}`);
  return (
    Number.isFinite(start.getTime()) &&
    (!["cars", "motorcycles"].includes(category) ||
      (Number.isFinite(end.getTime()) && end > start))
  );
}

export function pricing(
  vehicle: Vehicle,
  search: Search,
  quotedRental?: number,
) {
  const road = ["cars", "motorcycles"].includes(vehicle.cat);
  const days = road
    ? Math.max(
        1,
        Math.ceil(
          (new Date(`${search.returnDate}T${search.returnTime}`).getTime() -
            new Date(`${search.date}T${search.time}`).getTime()) /
            86400000,
        ),
      )
    : 1;
  const rental = quotedRental ?? (vehicle.price || 180000) * days;
  const extras =
    (search.extra ? (road ? 500 : 2500) : 0) +
    selectedPackages(vehicle.cat as Category, search.packages).reduce(
      (sum, item) => sum + item.price,
      0,
    );
  const fee = Math.round(rental * 0.05);
  const tax = Math.round((rental + extras + fee) * 0.07);
  return { days, rental, extras, fee, tax, total: rental + extras + fee + tax };
}

export function quoteCanPay(quote: Quote | null, id: string, now = Date.now()) {
  return (
    !!quote &&
    quote.vehicleId === id &&
    quote.status === "Awaiting Payment" &&
    !!quote.expiresAt &&
    quote.expiresAt > now
  );
}

export function addBooking(
  state: AppState,
  vehicle: Vehicle,
  token: string,
  now = Date.now(),
  paymentMethod: "Card" | "PromptPay" = "Card",
): AppState {
  if (state.bookings.some((b) => b.token === token)) return state;
  if (vehicle.mode === "quote" && !quoteCanPay(state.quote, vehicle.id, now))
    return state;
  const quote = vehicle.mode === "quote" ? state.quote : null;
  if (quote && state.bookings.some((b) => b.quoteId === quote.id)) return state;
  if (vehicle.id === "mercedes" && state.fleet === "Maintenance") return state;
  const search = quote?.search ?? state.search;
  if (
    !validateDates(search, vehicle.cat) ||
    state.partner.blocked.includes(search.date)
  )
    return state;
  const booking: Booking = {
    id: `RBC-${now.toString(36).toUpperCase()}`,
    token,
    vehicleId: vehicle.id,
    search: { ...search, packages: [...(search.packages ?? [])] },
    traveler: { ...(quote?.traveler ?? state.traveler) },
    total: pricing(vehicle, search, quote?.rental).total,
    deposit: vehicle.deposit,
    status:
      quote && !quote.availability ? "Awaiting confirmation" : "Confirmed",
    payment: "Paid",
    paymentMethod,
    createdAt: new Date(now).toISOString(),
    handover: false,
  };
  if (quote) booking.quoteId = quote.id;
  return {
    ...state,
    bookings: [booking, ...state.bookings],
    activity: [`Payment received · ${booking.id}`, ...state.activity],
  };
}

export const partnerNav = [
  "overview",
  "listings",
  "availability",
  "requests",
  "bookings",
  "earnings",
  "profile",
];
export const operationsNav = [
  "overview",
  "partners",
  "listings",
  "requests",
  "bookings",
  "fleet",
  "payments",
  "activity",
];
export const accountNav = [
  "profile",
  "bookings",
  "reviews",
  "saved",
  "payments",
  "messages",
];
export const wizardSteps = [
  "Category",
  "Vehicle Details",
  "Photos",
  "Location",
  "Pricing",
  "Availability",
  "Policies",
  "Review and Submit",
];
export function validRoute(parts: string[]) {
  if (!parts.length) return true;
  const [route, id] = parts;
  if (parts.length > 2) return false;
  if (["vehicle", "checkout", "request"].includes(route))
    return !!vehicleById(id);
  if (route === "search") return categories.some((c) => c.id === id);
  if (route === "account") return accountNav.includes(id || "bookings");
  if (route === "partner") return partnerNav.includes(id || "overview");
  if (route === "operations") return operationsNav.includes(id || "overview");
  if (route === "wizard") return /^\d$/.test(id || "0") && Number(id || 0) < 8;
  if (route === "experience") return ["andaman", "coast"].includes(id);
  return (
    !id &&
    ["quote", "confirmation", "experiences", "help", "guide"].includes(route)
  );
}
