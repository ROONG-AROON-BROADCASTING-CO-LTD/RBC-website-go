import { staffLoginPath } from "@/lib/staff-navigation";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ScreenRouter } from "@/components/rbc/screen-router";
import {
  validRoute,
  vehicleById,
  type Category,
  type Locale,
} from "@/lib/domain";
import { translate } from "@/lib/i18n";
import { currentAccount } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { listPublicListings } from "@/lib/server/public-listings";
type Props = { params: Promise<{ locale: string; slug?: string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug = [] } = await params;
  if (
    [
      "vehicle",
      "checkout",
      "confirmation",
      "experience",
      "experiences",
      "guide",
    ].includes(slug[0])
  )
    notFound();
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
  if (
    [
      "vehicle",
      "checkout",
      "confirmation",
      "experience",
      "experiences",
      "guide",
      "request",
    ].includes(slug[0])
  )
    notFound();
  if (slug[0] === "request" && vehicleById(slug[1]))
    redirect(`/${locale}/checkout/${slug[1]}`);
  if (slug[0] === "quote" || (slug[0] === "account" && slug[1] === "requests"))
    redirect(`/${locale}/account/bookings`);
  if (!validRoute(slug)) notFound();
  if (["partner", "wizard", "operations"].includes(slug[0])) {
    if (!process.env.DATABASE_URL) notFound();
    const account = await currentAccount();
    if (!account)
      redirect(
        slug[0] === "operations"
          ? staffLoginPath(locale)
          : `/${locale}/partner-login`,
      );
    const sql = getDb();
    if (slug[0] === "operations") {
      const [staff] = await sql<{ role: string }[]>`
        select role from rbc_go.staff_members where account_id = ${account.id}
      `;
      if (!staff) notFound();
      redirect(`/${locale}/operations/payments`);
    } else {
      const [member] = await sql<{ id: string }[]>`
        select partners.id from rbc_go.partner_members members
        join rbc_go.partners partners on partners.id = members.partner_id
        where members.account_id = ${account.id} and partners.status = 'active'
      `;
      if (!member) redirect(`/${locale}/apply`);
      redirect(`/${locale}/partner/overview`);
    }
  }
  const publicListings = process.env.DATABASE_URL
    ? slug[0] === "search"
      ? await listPublicListings(slug[1] as Category)
      : !slug.length
        ? (
            await Promise.all(
              ["boats", "motorcycles", "cars", "jets"].map(listPublicListings),
            )
          )
            .flat()
            .slice(0, 12)
        : []
    : [];
  return (
    <ScreenRouter
      key={slug.join("/")}
      parts={slug}
      publicListings={publicListings}
    />
  );
}
