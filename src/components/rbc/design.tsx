"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldGroup } from "@/components/ui/field";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useRBC } from "./provider";
import {
  PageHeading,
  Panel,
  Photo,
  Notice,
  Status,
  Blank,
  TextField,
} from "./common";
import { ExperienceCards } from "./discovery";
export function Experiences({ id }: { id?: string }) {
  const { t, href } = useRBC();
  const sea = id === "andaman";
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-5 md:py-8">
      <PageHeading
        eyebrow="RBC GO Experiences"
        title={
          id
            ? sea
              ? "An Andaman island escape"
              : "The coast, at your pace"
            : "Curated Trips & Experiences"
        }
        description="Make the journey part of the destination."
      />
      {!id ? (
        <ExperienceCards />
      ) : (
        <>
          <Photo
            name={sea ? "yacht" : "car"}
            alt={t(
              sea ? "An Andaman island escape" : "The coast, at your pace",
            )}
            className="mb-8 aspect-[1.4] rounded-2xl md:aspect-[2.5]"
            priority
          />
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_340px]">
            <Panel title="Your itinerary">
              <ol className="flex flex-col gap-6">
                {(sea
                  ? [
                      "09:00 · Meet your crew at the marina",
                      "10:00 · Discover hidden lagoons",
                      "12:30 · A relaxed lunch on board",
                      "16:30 · Return with a new perspective",
                    ]
                  : [
                      "09:00 · Collect your vehicle",
                      "10:00 · Explore the coastal road",
                      "13:00 · Discover a local favorite",
                      "17:00 · Return at your own pace",
                    ]
                ).map((step, i) => (
                  <li className="flex gap-4 text-sm leading-7" key={step}>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                      {i + 1}
                    </span>
                    {t(step)}
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel title="Make it yours">
              <p className="mb-6 text-sm leading-7 text-muted-foreground">
                {t(
                  "Choose your dates and review the full vehicle details before booking.",
                )}
              </p>
              <Button asChild className="w-full">
                <Link href={href(`vehicle/${sea ? "azimut" : "mercedes"}`)}>
                  {t("View Details")}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
export function Help() {
  const { t, href } = useRBC();
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-5 md:py-8">
      <PageHeading
        eyebrow="RBC GO Support"
        title="How can we help?"
        description="Support at every step"
      />
      <div className="flex flex-col gap-5">
        {[
          [
            "How do I book?",
            "Choose your vehicle and dates, add optional packages, and pay online.",
          ],
          [
            "When is my booking confirmed?",
            "Your booking is confirmed only when payment is successful and availability is secured.",
          ],
          [
            "Cancellation terms",
            "Free cancellation up to 48 hours before pickup. Later cancellations are subject to review.",
          ],
          [
            "Privacy policy",
            "This demo stores data in your browser only. No payment details or uploaded file contents are sent to a server.",
          ],
          [
            "Security deposit",
            "Collected separately at handover. Not included in the booking total.",
          ],
        ].map(([title, description]) => (
          <Panel key={title} title={title}>
            <p className="text-sm leading-7 text-muted-foreground">
              {t(description)}
            </p>
          </Panel>
        ))}
        <Button asChild className="self-start">
          <Link href={href("account/messages")}>
            <Headphones data-icon="inline-start" />
            {t("Contact support")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
export function DesignGuide() {
  const { t, href } = useRBC();
  const sitemap = [
    ["Customer", "Homepage", ""],
    ["Customer", "Search results", "search/boats"],
    ["Customer", "Listing details", "vehicle/azimut"],
    ["Customer", "Checkout", "checkout/mercedes"],
    ["Customer", "Confirmation", "confirmation"],
    ["Customer", "Customer account", "account/bookings"],
    ["Customer", "Trips & Experiences", "experiences"],
    ["Partner", "Partner application", "apply"],
    ["Partner", "Listing wizard", "wizard/0"],
    ["Partner", "Partner portal", "partner/overview"],
    ["Operations", "Operations dashboard", "operations/overview"],
  ];
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-5 md:py-8">
      <PageHeading
        eyebrow="RBC GO · Design system"
        title="Built for every journey"
        description="Sitemap, role permissions, journeys, and reusable components."
      />
      <Panel title="Visual identity">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
          {[
            ["Midnight navy", "#081321", "bg-navy text-white"],
            ["Canvas", "#F4F6F8", "bg-background"],
            ["Cards", "#FFFFFF", "bg-card"],
            ["Indigo blue", "#334B78", "bg-primary text-primary-foreground"],
            ["Deep navy", "#172338", "bg-foreground text-white"],
            ["Silver gray", "#D9DFE7", "bg-border"],
          ].map(([name, hex, cls]) => (
            <div key={hex} className="overflow-hidden rounded-xl border">
              <div className={`${cls} h-20`} />
              <div className="p-3 text-xs">
                <p>{name}</p>
                <p className="mt-1 text-muted-foreground">{hex}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm leading-7 text-muted-foreground">
          Inter + Thonburi / Tahoma · Tailwind CSS · shadcn/ui · 12–16 px
        </p>
      </Panel>
      <Panel title="Sitemap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Role")}</TableHead>
              <TableHead>{t("Page")}</TableHead>
              <TableHead>{t("Open")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sitemap.map(([role, title, path]) => (
              <TableRow key={path}>
                <TableCell>{t(role)}</TableCell>
                <TableCell>{t(title)}</TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="icon">
                    <Link href={href(path)} aria-label={t(title)}>
                      <ArrowUpRight />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
      <Panel title="Role permissions">
        <Table>
          <TableHeader>
            <TableRow>
              {["Action", "Customer", "Partner", "Operations"].map((s) => (
                <TableHead key={s}>{t(s)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Search and book", "✓", "—", "—"],
              ["Own bookings and payments", "✓", "—", "All"],
              ["Own listings and availability", "—", "✓", "All"],
              ["Approve partners and listings", "—", "—", "✓"],
              ["Prepare quotations and refunds", "—", "—", "✓"],
            ].map(([action, ...roles]) => (
              <TableRow key={action}>
                <TableCell>{t(action)}</TableCell>
                {roles.map((r, i) => (
                  <TableCell key={i}>{t(r)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-5">
          <Notice title="Demo roles are not authenticated." />
        </div>
      </Panel>
      <Panel title="Customer journeys">
        <div className="flex flex-col gap-8">
          {[
            [
              "Instant booking",
              [
                "Search",
                "Listing details",
                "Confirm availability",
                "Checkout",
                "Payment",
                "Confirmed",
              ],
            ],
            [
              "Quotation",
              [
                "Request Submitted",
                "Under Review",
                "Quote Ready",
                "Accept Offer",
                "Payment",
                "Awaiting confirmation",
              ],
            ],
            [
              "Partner onboarding",
              [
                "Application",
                "Pending approval",
                "Listing wizard",
                "Review and Submit",
                "Approved",
              ],
            ],
          ].map(([name, steps]) => (
            <div key={String(name)}>
              <h3 className="mb-4 text-sm font-semibold">{t(String(name))}</h3>
              <div className="flex flex-wrap items-center gap-3">
                {(steps as string[]).map((s, i) => (
                  <div className="flex items-center gap-3" key={s}>
                    {i > 0 && (
                      <ArrowRight className="size-4 text-muted-foreground" />
                    )}
                    <span className="rounded-xl border bg-muted p-3 text-xs">
                      {t(s)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Reusable components">
          <div className="flex flex-col gap-7">
            <div className="flex flex-wrap gap-3">
              <Button>{t("Search Vehicles")}</Button>
              <Button variant="outline">{t("View Details")}</Button>
              <Button disabled>{t("Continue")}</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "Confirmed",
                "Pending approval",
                "Cancelled",
                "Refund processing",
              ].map((s) => (
                <Status key={s} value={s} />
              ))}
            </div>
            <FieldGroup>
              <TextField
                label="Email"
                value=""
                readOnly
                error="Please enter a valid email address."
              />
            </FieldGroup>
            <Notice title="Payment failed. Your details are saved." error />
          </div>
        </Panel>
        <Panel title="Loading and empty states">
          <div className="flex flex-col gap-5">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-5 w-2/3" />
            <Blank title="No records yet" />
          </div>
        </Panel>
      </div>
    </div>
  );
}
