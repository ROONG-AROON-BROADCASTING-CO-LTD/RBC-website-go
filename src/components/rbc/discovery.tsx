"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Headphones,
  CreditCard,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup } from "@/components/ui/field";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { categories, type Category } from "@/lib/domain";
import { useRBC } from "./provider";
import {
  Photo,
  Panel,
  SectionTitle,
  PageHeading,
  ChoiceField,
  TextField,
  Blank,
  Notice,
  categoryIcons,
} from "./common";
import { SearchPanel } from "./search-panel";
import { cn } from "@/lib/utils";
import type { PublicListing } from "@/lib/server/public-listings";
import { CardSlider } from "./card-slider";
import { PublishedListingCard } from "@/components/customer/published-listing-card";

const categoryColors = {
  boats: "bg-ocean-soft text-ocean",
  motorcycles: "bg-coral-soft text-coral",
  cars: "bg-rating-soft text-rating-foreground",
  jets: "bg-lavender-soft text-lavender",
};

export function Home({
  publicListings = [],
}: {
  publicListings?: PublicListing[];
}) {
  const { t, href, setState, go, ready } = useRBC();
  return (
    <>
      <section className="relative bg-navy text-white md:min-h-[570px]">
        <Photo
          name="sea"
          alt={t("Your journey. By road, sea, or sky.")}
          priority
          sizes="100vw"
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/70 via-navy/40 to-navy/25 md:from-navy/55 md:via-navy/30 md:to-navy/10" />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-30 md:px-5 md:pb-20 md:pt-36">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[.24em] text-white/70">
            ROAD · SEA · SKY
          </p>
          <h1 className="mx-auto max-w-6xl text-center text-[30px] font-semibold leading-[1.3] tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] md:text-[clamp(3rem,5vw,5.5rem)]">
            {t("Every journey, your way.")}
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-6 text-white/80 md:text-base">
            <span className="md:hidden">
              {t("Choose your vehicle. Start your journey.")}
            </span>
            <span className="hidden md:inline">
              {t(
                "Discover and book cars, motorcycles, boats, and private jets from trusted service partners.",
              )}
            </span>
          </p>
        </div>
      </section>
      <div className="relative mx-auto -mt-6 max-w-7xl px-4 md:-mt-20">
        <SearchPanel key={String(ready)} />
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-4 text-xs font-bold text-muted-foreground">
          {[
            [ShieldCheck, "Verified partners"],
            [CreditCard, "Transparent pricing"],
            [Headphones, "Support at every step"],
          ].map(([Icon, text]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <span key={String(text)} className="flex items-center gap-2">
                <I className="size-5" />
                {t(String(text))}
              </span>
            );
          })}
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-8 pt-3 md:gap-12 md:px-5 md:pb-10 md:pt-5">
        <section>
          <SectionTitle
            title="Explore by Land, Sea, and Air"
            description="Every journey starts with a possibility."
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {categories.map((c) => {
              const Icon = categoryIcons[c.id as Category];
              return (
                <Link
                  key={c.id}
                  href={href(`search/${c.id}`)}
                  className="group min-w-0 overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg"
                >
                  <Photo
                    name={c.img}
                    alt={t(c.name)}
                    className="aspect-[1.25]"
                  />
                  <div className="p-3 md:p-4">
                    <h3 className="flex min-w-0 flex-col items-start gap-2 text-sm font-semibold leading-6 sm:flex-row sm:items-center md:text-base">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          categoryColors[c.id as Category],
                        )}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="min-h-12 min-w-0 w-full break-words sm:min-h-0 sm:w-auto">
                        {t(c.name)}
                      </span>
                    </h3>
                    <p className="mt-2 hidden text-xs leading-6 text-muted-foreground sm:block">
                      {t(c.desc)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        <section>
          <SectionTitle
            title="Popular Destinations"
            description="Find your next escape."
          />
          <CardSlider label="Popular Destinations" columns={4}>
            {[
              ["Phuket", "sea"],
              ["Bangkok", "bangkok"],
              ["Koh Samui", "samui"],
              ["Chiang Mai", "chiangmai"],
            ].map(([place, img]) => (
              <button
                key={place}
                className="group relative block w-full overflow-hidden rounded-2xl text-left text-white shadow-sm transition-shadow hover:shadow-lg"
                onClick={() => {
                  setState((s) => ({
                    ...s,
                    search: {
                      ...s.search,
                      location: place,
                      category: place === "Phuket" ? "boats" : "cars",
                    },
                  }));
                  go(`search/${place === "Phuket" ? "boats" : "cars"}`);
                }}
              >
                <Photo
                  name={img}
                  alt={t(place)}
                  className="aspect-[.9] transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" />
                <div className="absolute inset-x-5 bottom-5 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{t(place)}</h3>
                  <span className="flex size-9 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-sm">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </button>
            ))}
          </CardSlider>
        </section>
        <section>
          <SectionTitle
            title="Featured Vehicles"
            description="Exceptional vehicles. Trusted local partners."
            href={href("search/boats")}
          />
          {publicListings.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              {publicListings.map((listing) => (
                <PublishedListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
          {!publicListings.length && (
            <Notice title="No published vehicles yet" />
          )}
        </section>
        <section>
          <SectionTitle title="How RBC GO Works" />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              [
                "01",
                "Find your journey",
                "Search and compare vehicles that fit your plans.",
              ],
              [
                "02",
                "Book your way",
                "Choose your packages and complete your booking online.",
              ],
              [
                "03",
                "Travel with confidence",
                "Clear details, trusted partners, and support at every step.",
              ],
            ].map(([n, title, desc]) => (
              <div key={n} className="border-t pt-4">
                <span className="text-4xl font-light text-primary/40">{n}</span>
                <h3 className="mb-2 mt-3 text-lg font-semibold">{t(title)}</h3>
                <p className="max-w-xs text-sm leading-7 text-muted-foreground">
                  {t(desc)}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-primary px-5 py-7 text-primary-foreground md:px-8 md:py-8">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[.18em] text-white/65">
              RBC GO PARTNERS
            </p>
            <h2 className="max-w-2xl text-3xl font-semibold leading-snug">
              {t("Turn your vehicles into opportunities.")}
            </h2>
            <p className="mt-4 text-sm text-white/70">
              {t("Connect with travelers. Grow your business.")}
            </p>
          </div>
          <Button variant="secondary" size="lg" asChild>
            <Link href={href("apply")}>
              {t("Become a Partner")}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </section>
      </div>
    </>
  );
}

export function ExperienceCards() {
  return null;
}

type Filters = { location: string; capacity: string; max: string };
function FiltersForm({
  filters: f,
  setFilters,
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
}) {
  const patch = (key: keyof Filters, value: string) =>
    setFilters({ ...f, [key]: value });
  return (
    <FieldGroup>
      <ChoiceField
        label="Location"
        value={f.location}
        onChange={(value) => patch("location", value)}
        options={[
          "All locations",
          "Phuket",
          "Bangkok",
          "Koh Samui",
          "Chiang Mai",
        ]}
      />
      <TextField
        label="Maximum price (THB)"
        type="number"
        min={0}
        value={f.max}
        onChange={(event) => patch("max", event.target.value)}
      />
      <ChoiceField
        label="Passenger capacity"
        value={f.capacity}
        onChange={(value) => patch("capacity", value)}
        options={["1", "2", "4", "6", "8", "12"]}
      />
    </FieldGroup>
  );
}
export function SearchResults({
  category,
  publicListings,
}: {
  category: Category;
  publicListings: PublicListing[];
}) {
  const { state, t, href } = useRBC();
  const initial: Filters = {
    location: state.search.location,
    capacity: "1",
    max: "",
  };
  const [filters, setFilters] = useState<Filters>(initial);
  const [sort, setSort] = useState("Recommended");
  const publicResults = publicListings
    .filter(
      (listing) =>
        (filters.location === "All locations" ||
          listing.location_text
            .toLocaleLowerCase()
            .includes(filters.location.toLocaleLowerCase())) &&
        listing.capacity >= Number(filters.capacity) &&
        (!filters.max ||
          Number(listing.base_price_satang) / 100 <= Number(filters.max)),
    )
    .sort((a, b) =>
      sort === "Price: low to high"
        ? Number(a.base_price_satang) - Number(b.base_price_satang)
        : 0,
    );
  const reset = () =>
    setFilters({
      ...initial,
      location: "All locations",
      capacity: "1",
    });
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:py-6">
      <SearchPanel
        compact
        initialCategory={category}
        onSearch={() => setFilters(initial)}
      />
      <div className="mt-5 grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <Panel
            title="Filters"
            footer={
              <Button variant="outline" className="w-full" onClick={reset}>
                {t("Clear filters")}
              </Button>
            }
          >
            <FiltersForm filters={filters} setFilters={setFilters} />
          </Panel>
        </aside>
        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <PageHeading
              className="mb-0"
              title={categories.find((c) => c.id === category)!.name}
              description="Approved partner listings"
            />
            <div className="flex shrink-0 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="lg:hidden" variant="outline">
                    <SlidersHorizontal data-icon="inline-start" />
                    {t("Filters")}
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{t("Filters")}</SheetTitle>
                    <SheetDescription>
                      {t("Find your journey")}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="p-5">
                    <FiltersForm filters={filters} setFilters={setFilters} />
                    <Button
                      onClick={reset}
                      variant="outline"
                      className="my-5 w-full"
                    >
                      {t("Clear filters")}
                    </Button>
                    <SheetClose asChild>
                      <Button className="w-full">
                        {t("Show results")} ({publicResults.length})
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-2">
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {t("Sort by")}
                </span>
                <div className="w-44">
                  <ChoiceField
                    label="Sort by"
                    hideLabel
                    value={sort}
                    onChange={setSort}
                    options={["Recommended", "Price: low to high"]}
                  />
                </div>
              </div>
            </div>
          </div>
          {publicResults.length > 0 && (
            <section
              className="mb-8 flex flex-col gap-4"
              aria-label={t("Approved partner listings")}
            >
              {publicResults.map((listing) => (
                <PublishedListingCard key={listing.id} listing={listing} />
              ))}
            </section>
          )}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="mr-2 text-sm text-muted-foreground">
              {t("Approved partner listings")} · {publicResults.length}{" "}
              {t("results")}
            </p>
            {Object.entries(filters)
              .filter(
                ([k, v]) =>
                  k === "location" &&
                  !["All", "All locations", "all"].includes(String(v)),
              )
              .map(([k, v]) => (
                <Badge key={k} variant="secondary">
                  {t(String(v))}
                </Badge>
              ))}
          </div>
          <div className="flex flex-col gap-5">
            {!publicResults.length ? (
              <Blank
                title="No vehicles match these filters."
                description="Try another location or adjust your filters."
                action={<Button onClick={reset}>{t("Clear filters")}</Button>}
              />
            ) : null}
          </div>
          <p className="mt-6 text-xs leading-6 text-muted-foreground">
            {t(
              "Starting prices are estimates. Review the final total before payment.",
            )}{" "}
            <Link href={href("help")} className="underline">
              {t("Help")}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
