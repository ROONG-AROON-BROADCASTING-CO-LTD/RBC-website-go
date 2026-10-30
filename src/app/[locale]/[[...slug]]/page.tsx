import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ScreenRouter } from "@/components/rbc/screen-router";
import { validRoute, vehicleById, type Locale } from "@/lib/domain";
import { translate } from "@/lib/i18n";
type Props = { params: Promise<{ locale: string; slug?: string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug = [] } = await params;
  const titles: Record<string, string> = {
    search: "Search Vehicles",
    vehicle: vehicleById(slug[1])?.name || "Listing details",
    checkout: "Checkout",
    quote: "Quotation",
    request: "Request a Quote",
    confirmation: "Confirmation",
    account: "Customer account",
    partner: "Partner portal",
    operations: "Operations dashboard",
    apply: "Partner application",
    wizard: "Listing wizard",
    experiences: "Trips & Experiences",
    guide: "Design guide",
    help: "Help",
  };
  return {
    title: translate(
      locale as Locale,
      titles[slug[0]] || "Your journey. By road, sea, or sky.",
    ),
  };
}
export default async function Page({ params }: Props) {
  const { locale, slug = [] } = await params;
  if (slug[0] === "request" && vehicleById(slug[1]))
    redirect(`/${locale}/checkout/${slug[1]}`);
  if (slug[0] === "quote" || (slug[0] === "account" && slug[1] === "requests"))
    redirect(`/${locale}/account/bookings`);
  if (!validRoute(slug)) notFound();
  return <ScreenRouter key={slug.join("/")} parts={slug} />;
}
