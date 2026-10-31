"use client";
import { useState, useId } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShieldCheck,
  Headphones,
  CreditCard,
  SlidersHorizontal,
  Check,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  categories,
  vehicles,
  validateDates,
  type Category,
  type Vehicle,
} from "@/lib/domain";
import { useRBC } from "./provider";
import {
  Photo,
  Panel,
  SectionTitle,
  PageHeading,
  VehicleCard,
  ChoiceField,
  TextField,
  Blank,
  Notice,
  PriceBreakdown,
  categoryIcons,
} from "./common";
import { SearchPanel } from "./search-panel";
import { cn } from "@/lib/utils";
import type { PublicListing } from "@/lib/server/public-listings";
import { CardSlider } from "./card-slider";
import { Rating } from "./rating";
import { VehicleGallery } from "./vehicle-gallery";

const categoryColors = {
  boats: "bg-ocean-soft text-ocean",
  motorcycles: "bg-coral-soft text-coral",
  cars: "bg-rating-soft text-rating-foreground",
  jets: "bg-lavender-soft text-lavender",
};

export function Home() {
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
          <CardSlider label="Featured Vehicles">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </CardSlider>
        </section>
        <section>
          <SectionTitle
            title="Curated Trips & Experiences"
            description="Make the journey part of the destination."
            href={href("experiences")}
          />
          <ExperienceCards />
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
  const { t, href } = useRBC();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[
        [
          "andaman",
          "yacht",
          "An Andaman island escape",
          "A private day at sea, shaped around you.",
        ],
        [
          "coast",
          "car",
          "The coast, at your pace",
          "Scenic roads, hidden beaches, and a little more freedom.",
        ],
      ].map(([id, img, title, desc]) => (
        <Link
          key={id}
          href={href(`experience/${id}`)}
          className="group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg"
        >
          <Photo name={img} alt={t(title)} className="aspect-[1.8]" />
          <div
            className={cn(
              "p-4 md:p-5",
              id === "andaman" ? "bg-ocean-soft" : "bg-rating-soft",
            )}
          >
            <h3 className="flex items-center justify-between gap-4 text-xl font-semibold">
              {t(title)}
              <ArrowRight
                className={cn(
                  "size-5 shrink-0",
                  id === "andaman" ? "text-ocean" : "text-rating-foreground",
                )}
              />
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {t(desc)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

type Filters = {
  location: string;
  mode: string;
  capacity: string;
  max: string;
  service: string;
  rating: string;
  amenity: string;
  unit: string;
  cancellation: boolean;
};
function FiltersForm({
  filters: f,
  setFilters,
  category,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  category: Category;
}) {
  const { t } = useRBC();
  const cancelId = useId();
  const patch = (k: keyof Filters, v: string | boolean) =>
    setFilters({ ...f, [k]: v });
  return (
    <FieldGroup>
      <ChoiceField
        label="Location"
        value={f.location}
        onChange={(v) => patch("location", v)}
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
        onChange={(e) => patch("max", e.target.value)}
      />
      <ChoiceField
        label="Pricing unit"
        value={f.unit}
        onChange={(v) => patch("unit", v)}
        options={["All", "day", "trip", "charter"]}
      />

      <ChoiceField
        label="Passenger capacity"
        value={f.capacity}
        onChange={(v) => patch("capacity", v)}
        options={["1", "2", "4", "6", "8", "12"]}
      />
      <ChoiceField
        label="Service"
        value={f.service}
        onChange={(v) => patch("service", v)}
        options={[
          "All",
          ...(category === "boats"
            ? ["Skipper & crew included"]
            : category === "jets"
              ? ["Flight crew included"]
              : ["Self-drive", "Chauffeur"]),
        ]}
      />
      <ChoiceField
        label="Amenities"
        value={f.amenity}
        onChange={(v) => patch("amenity", v)}
        options={[
          "All",
          "Air conditioning",
          "Refreshments",
          "Wi-Fi",
          "Helmets",
          "Snorkeling gear",
        ]}
      />
      <ChoiceField
        label="Provider rating"
        value={f.rating}
        onChange={(v) => patch("rating", v)}
        options={["All", "4.8", "4.9"]}
      />
      <Field orientation="horizontal">
        <Checkbox
          id={cancelId}
          checked={f.cancellation}
          onCheckedChange={(v) => patch("cancellation", v === true)}
        />
        <FieldLabel htmlFor={cancelId}>{t("Free cancellation")}</FieldLabel>
      </Field>
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
  const { state, t, href, locale } = useRBC();
  const initial: Filters = {
    location: state.search.location,
    mode: "all",
    capacity: "1",
    max: "",
    service: category === "cars" ? state.search.drive : "All",
    rating: "All",
    amenity: "All",
    unit: "All",
    cancellation: false,
  };
  const [filters, setFilters] = useState<Filters>(initial);
  const [sort, setSort] = useState("Recommended");
  const results = vehicles
    .filter(
      (v) =>
        v.cat === category &&
        (filters.location === "All locations" ||
          v.location === filters.location) &&
        (filters.mode === "all" || v.mode === filters.mode) &&
        v.capacity >= Number(filters.capacity) &&
        (!filters.max || (v.price > 0 && v.price <= Number(filters.max))) &&
        (filters.service === "All" || v.service === filters.service) &&
        (filters.rating === "All" || v.rating >= Number(filters.rating)) &&
        (filters.amenity === "All" || v.amenities.includes(filters.amenity)) &&
        (filters.unit === "All" || v.unit === filters.unit) &&
        (!filters.cancellation || v.mode === "instant"),
    )
    .sort((a, b) =>
      sort === "Price: low to high"
        ? (a.price || Infinity) - (b.price || Infinity)
        : sort === "Top rated"
          ? b.rating - a.rating
          : 0,
    );
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
  const price = new Intl.NumberFormat(
    locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-GB",
    { style: "currency", currency: "THB", maximumFractionDigits: 2 },
  );
  const reset = () =>
    setFilters({
      ...initial,
      location: "All locations",
      service: "All",
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
            <FiltersForm
              filters={filters}
              setFilters={setFilters}
              category={category}
            />
          </Panel>
        </aside>
        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <PageHeading
              className="mb-0"
              title={categories.find((c) => c.id === category)!.name}
              description={
                publicResults.length
                  ? "Browse partner listings and sample inventory"
                  : "Sample inventory and reviews"
              }
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
                    <FiltersForm
                      filters={filters}
                      setFilters={setFilters}
                      category={category}
                    />
                    <Button
                      onClick={reset}
                      variant="outline"
                      className="my-5 w-full"
                    >
                      {t("Clear filters")}
                    </Button>
                    <SheetClose asChild>
                      <Button className="w-full">
                        {t("Show results")} (
                        {results.length + publicResults.length})
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
                    options={["Recommended", "Price: low to high", "Top rated"]}
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
              <div>
                <h2 className="text-xl font-semibold">
                  {t("Approved partner listings")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(
                    "These vehicles are listed by reviewed partners. Booking will open later.",
                  )}
                </p>
              </div>
              {publicResults.map((listing) => (
                <Card
                  key={listing.id}
                  className="overflow-hidden py-0 md:flex-row md:gap-0"
                >
                  <div className="relative aspect-[1.5] bg-muted md:aspect-auto md:min-h-60 md:w-[38%] md:shrink-0">
                    {listing.image_id && (
                      <Image
                        src={`/api/listing-images/${listing.image_id}`}
                        alt={listing.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 300px"
                        unoptimized
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <CardHeader className="pt-4">
                      <CardTitle className="text-lg">
                        <Link href={href(`listing/${listing.id}`)}>
                          {listing.title}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        {listing.location_text} · {listing.business_name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 text-sm text-muted-foreground">
                      <p>{t(`${listing.capacity} guests`)}</p>
                      <p className="mt-2 line-clamp-2">{listing.description}</p>
                    </CardContent>
                    <CardFooter className="mt-auto justify-between gap-3 py-3">
                      <div>
                        <p className="font-semibold">
                          {price.format(
                            Number(listing.base_price_satang) / 100,
                          )}
                        </p>
                        <Badge variant="secondary" className="mt-2">
                          {t("Booking coming soon")}
                        </Badge>
                      </div>
                      <Button variant="outline" asChild>
                        <Link href={href(`listing/${listing.id}`)}>
                          {t("View details")}
                        </Link>
                      </Button>
                    </CardFooter>
                  </div>
                </Card>
              ))}
            </section>
          )}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="mr-2 text-sm text-muted-foreground">
              {t("Sample inventory and reviews")} · {results.length}{" "}
              {t("results")}
            </p>
            {Object.entries(filters)
              .filter(
                ([k, v]) =>
                  ["location", "mode", "service", "unit", "amenity"].includes(
                    k,
                  ) && !["All", "All locations", "all"].includes(String(v)),
              )
              .map(([k, v]) => (
                <Badge key={k} variant="secondary">
                  {t(String(v))}
                </Badge>
              ))}
          </div>
          <div className="flex flex-col gap-5">
            {results.length ? (
              results.map((v) => (
                <VehicleCard key={v.id} vehicle={v} horizontal />
              ))
            ) : (
              <Blank
                title="No vehicles match these filters."
                description="Try another location or adjust your filters."
                action={<Button onClick={reset}>{t("Clear filters")}</Button>}
              />
            )}
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

export function VehicleDetail({ vehicle: v }: { vehicle: Vehicle }) {
  const { t, state, setState, go, amount } = useRBC();
  const [checked, setChecked] = useState("");
  const [error, setError] = useState("");
  const fingerprint = JSON.stringify(state.search);
  const available = checked === fingerprint;
  const check = () => {
    if (!validateDates(state.search, v.cat)) {
      setError("Return must be after pickup.");
      return;
    }
    if (
      state.partner.blocked.includes(state.search.date) ||
      (v.id === "mercedes" && state.fleet === "Maintenance")
    ) {
      setError("These dates are unavailable. Try another date.");
      return;
    }
    setChecked(fingerprint);
    setError("");
  };
  const patch = (k: string, value: string) => {
    setState((s) => ({ ...s, search: { ...s.search, [k]: value } }));
    setError("");
  };
  const next = () =>
    v.mode === "quote"
      ? go(`request/${v.id}`)
      : available
        ? go(`checkout/${v.id}`)
        : check();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-5 md:py-8">
      <PageHeading
        eyebrow={`${t(v.location)} · ${t(v.type)}`}
        title={v.name}
        description={v.place}
        action={<Rating score={v.rating} reviews={v.reviews} />}
      />
      <VehicleGallery vehicle={v} />
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <Panel title="Travel with confidence">
            <div className="flex flex-wrap gap-6 text-sm">
              <span className="flex items-center gap-2">
                <Users className="size-5" />
                {t(`${v.capacity} guests`)}
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-5" />
                {t(v.service)}
              </span>
              <span>{t(v.spec)}</span>
            </div>
          </Panel>
          <Panel title="Your service partner" description={v.provider}>
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-5 text-primary" />
              {t("Verified partner")}
              <Rating score={v.rating} />
            </div>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {t("Sample inventory and reviews")}
            </p>
          </Panel>
          <Panel title="Amenities">
            <div className="grid gap-4 sm:grid-cols-2">
              {v.amenities.map((a) => (
                <p key={a} className="flex items-center gap-3 text-sm">
                  <Check className="size-4 text-primary" />
                  {t(a)}
                </p>
              ))}
            </div>
          </Panel>
          <Panel title="Pickup & departure">
            <p className="flex items-start gap-3 text-sm leading-7">
              <MapPin className="mt-1 size-5 shrink-0" />
              {t(v.place)} · {t(v.location)}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t("Exact meeting instructions are shared after confirmation.")}
            </p>
          </Panel>
          <Panel title="Included & excluded">
            <div className="grid gap-6 text-sm leading-7 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 font-semibold">{t("Included")}</h3>
                {v.amenities.slice(0, 3).map((a) => (
                  <p key={a}>✓ {t(a)}</p>
                ))}
              </div>
              <div>
                <h3 className="mb-2 font-semibold">{t("Not included")}</h3>
                <p>{t("Personal expenses")}</p>
                <p>{t("Security deposit")}</p>
                <p>{t("Additional services outside the agreed itinerary")}</p>
              </div>
            </div>
          </Panel>
          <Panel title="Rental requirements">
            <p className="text-sm leading-7">
              {t(
                ["cars", "motorcycles"].includes(v.cat)
                  ? "Valid driving license, passport or ID, and security deposit required."
                  : "Passenger details and the agreed itinerary must be confirmed before departure.",
              )}
            </p>
          </Panel>
          <Panel title="Cancellation terms">
            <p className="text-sm leading-7">
              {t(
                v.mode === "instant"
                  ? "Free cancellation up to 48 hours before pickup. Later cancellations are subject to review."
                  : "Cancellation terms are confirmed in your quotation before you accept.",
              )}
            </p>
          </Panel>
          <Panel
            title="Reviews"
            description="Sample reviews · Illustrative content"
          >
            <p className="text-sm leading-7">
              “
              {t(
                "Helpful support from the first question to the final confirmation.",
              )}
              ”
            </p>
          </Panel>
        </div>
        <div className="flex flex-col gap-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:p-1">
          <Panel
            className="lg:min-h-0 lg:[&>[data-slot=card-header]]:shrink-0 lg:[&>[data-slot=card-content]]:min-h-0 lg:[&>[data-slot=card-content]]:overflow-y-auto lg:[&>[data-slot=card-footer]]:shrink-0"
            footer={
              <div className="flex w-full flex-col gap-3">
                <Button size="lg" className="w-full" onClick={next}>
                  {t(
                    v.mode === "quote"
                      ? "Request a Quote"
                      : available
                        ? "Continue to checkout"
                        : "Check availability",
                  )}
                  <ArrowRight data-icon="inline-end" />
                </Button>
                <p className="text-xs leading-6 text-muted-foreground">
                  {t(
                    v.mode === "quote"
                      ? "Subject to confirmation"
                      : "No charge until you review and pay.",
                  )}
                </p>
              </div>
            }
            title={v.mode === "quote" ? "Request a Quote" : "Plan your journey"}
          >
            <FieldGroup>
              <TextField
                label="Departure date"
                type="date"
                required
                value={state.search.date}
                onChange={(e) => patch("date", e.target.value)}
              />
              {["cars", "motorcycles"].includes(v.cat) && (
                <>
                  <TextField
                    label="Pickup time"
                    type="time"
                    value={state.search.time}
                    onChange={(e) => patch("time", e.target.value)}
                  />
                  <TextField
                    label="Return date"
                    type="date"
                    min={state.search.date}
                    value={state.search.returnDate}
                    onChange={(e) => patch("returnDate", e.target.value)}
                  />
                  <TextField
                    label="Return time"
                    type="time"
                    value={state.search.returnTime}
                    onChange={(e) => patch("returnTime", e.target.value)}
                  />
                </>
              )}
              <Field orientation="horizontal">
                <Checkbox
                  id="extras"
                  checked={state.search.extra}
                  onCheckedChange={(value) =>
                    setState((s) => ({
                      ...s,
                      search: { ...s.search, extra: value === true },
                    }))
                  }
                />
                <FieldLabel htmlFor="extras">{t("Optional extras")}</FieldLabel>
              </Field>
              <PriceBreakdown vehicle={v} search={state.search} />
              {error && <Notice error title={error} />}{" "}
              {available && <Notice title="Availability checked" />}
            </FieldGroup>
          </Panel>
          <div className="shrink-0">
            <Notice title="Local demo · No real payments" />
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 border-t bg-card px-4 py-3 lg:hidden">
        <div>
          <p className="text-xs text-muted-foreground">{t("From")}</p>
          <strong>{v.price ? amount(v.price) : t("Request a Quote")}</strong>
        </div>
        <Button onClick={next}>
          {t(
            v.mode === "quote"
              ? "Request a Quote"
              : available
                ? "Continue"
                : "Check availability",
          )}
        </Button>
      </div>
      <div className="h-20 lg:hidden" />
    </div>
  );
}
