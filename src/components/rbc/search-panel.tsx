"use client";
import { useState } from "react";
import {
  Search as SearchIcon,
  MapPin,
  CalendarDays,
  Pencil,
} from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { categories, validateDates, type Category } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useRBC } from "./provider";
import { ChoiceField, TextField, categoryIcons, Notice } from "./common";
function SearchForm({
  compact = false,
  frameless = false,
  category,
  onCategoryChange,
  onSearch,
  onComplete,
}: {
  compact?: boolean;
  frameless?: boolean;
  category: Category;
  onCategoryChange: (category: Category) => void;
  onSearch?: () => void;
  onComplete?: () => void;
}) {
  const { state, setState, t, go } = useRBC();
  const [error, setError] = useState(false);
  const s = state.search;
  const patch = (key: string, value: string | number) =>
    setState((prev) => ({
      ...prev,
      search: { ...prev.search, [key]: value, category },
    }));
  const road = ["cars", "motorcycles"].includes(category);
  return (
    <form
      className={cn(
        frameless ? "" : "rounded-2xl border bg-card p-4 shadow-sm lg:p-5",
        !frameless && !compact && "shadow-xl shadow-navy/5",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        if (!validateDates(s, category)) {
          setError(true);
          return;
        }
        setState((prev) => ({ ...prev, search: { ...prev.search, category } }));
        setError(false);
        onSearch?.();
        onComplete?.();
        go(`search/${category}`);
      }}
    >
      <div className="mb-4 border-b pb-3">
        <CategoryPicker category={category} onChange={onCategoryChange} />
      </div>
      <FieldGroup
        className={cn(
          "grid items-end gap-3 sm:grid-cols-2 lg:gap-4",
          road ? "lg:grid-cols-4" : "lg:grid-cols-5",
        )}
      >
        <ChoiceField
          label={
            category === "boats"
              ? "Departure area / marina"
              : category === "jets"
                ? "Departure airport"
                : "Pickup location"
          }
          value={s.location}
          onChange={(v) => patch("location", v)}
          options={["Phuket", "Bangkok", "Koh Samui", "Chiang Mai"]}
        />
        {category === "jets" && (
          <ChoiceField
            label="Destination airport"
            value={s.destination}
            onChange={(v) => patch("destination", v)}
            options={["Phuket (HKT)", "Bangkok (DMK)", "Chiang Mai (CNX)"]}
          />
        )}
        <TextField
          label={road ? "Pickup date" : "Departure date"}
          type="date"
          required
          value={s.date}
          onChange={(e) => patch("date", e.target.value)}
        />
        {road ? (
          <>
            <TextField
              label="Pickup time"
              type="time"
              required
              value={s.time}
              onChange={(e) => patch("time", e.target.value)}
            />
            <TextField
              label="Return date"
              type="date"
              required
              min={s.date}
              value={s.returnDate}
              onChange={(e) => patch("returnDate", e.target.value)}
            />
            <TextField
              label="Return time"
              type="time"
              required
              value={s.returnTime}
              onChange={(e) => patch("returnTime", e.target.value)}
            />
            {category === "cars" && (
              <ChoiceField
                label="Service"
                value={s.drive}
                onChange={(v) => patch("drive", v)}
                options={["Self-drive", "Chauffeur"]}
              />
            )}
            <ChoiceField
              label="Return location"
              value={
                s.destination.startsWith("Phuket (")
                  ? "Phuket"
                  : ["Phuket", "Bangkok", "Koh Samui", "Chiang Mai"].includes(
                        s.destination,
                      )
                    ? s.destination
                    : "Phuket"
              }
              onChange={(v) => patch("destination", v)}
              options={["Phuket", "Bangkok", "Koh Samui", "Chiang Mai"]}
            />
          </>
        ) : category === "boats" ? (
          <>
            <ChoiceField
              label="Duration"
              value={s.duration}
              onChange={(v) => patch("duration", v)}
              options={["Full day", "Half day", "Sunset cruise"]}
            />
            <ChoiceField
              label="Passengers"
              value={String(s.guests)}
              onChange={(v) => patch("guests", Number(v))}
              options={[1, 2, 4, 6, 8, 12].map((v) => String(v))}
            />
          </>
        ) : (
          <>
            <TextField
              label="Departure time"
              type="time"
              required
              value={s.time}
              onChange={(e) => patch("time", e.target.value)}
            />
            <TextField
              label="Passengers"
              type="number"
              min={1}
              max={16}
              required
              value={s.guests}
              onChange={(e) => patch("guests", Number(e.target.value))}
            />
            <ChoiceField
              label="Flight type"
              value={s.flight}
              onChange={(v) => patch("flight", v)}
              options={["One-way", "Return"]}
            />
            {s.flight === "Return" && (
              <TextField
                label="Return date"
                type="date"
                min={s.date}
                value={s.returnDate}
                required
                onChange={(e) => patch("returnDate", e.target.value)}
              />
            )}
          </>
        )}
        <Button size="lg" type="submit" className="min-h-12 w-full">
          <SearchIcon data-icon="inline-start" />
          {t("Search Vehicles")}
        </Button>
      </FieldGroup>
      {error && (
        <div className="mt-5">
          <Notice title="Return must be after pickup." error />
        </div>
      )}
    </form>
  );
}

function CategoryPicker({
  category,
  onChange,
}: {
  category: Category;
  onChange: (category: Category) => void;
}) {
  const { t } = useRBC();
  return (
    <ToggleGroup
      type="single"
      value={category}
      onValueChange={(value) => {
        if (value) onChange(value as Category);
      }}
      aria-label={t("Vehicle categories")}
      className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-fit"
    >
      {categories.map((item) => {
        const Icon = categoryIcons[item.id as Category];
        return (
          <ToggleGroupItem
            key={item.id}
            value={item.id}
            className="h-auto min-h-11 min-w-0 gap-2 whitespace-normal px-2 py-2 text-xs sm:px-3 sm:text-sm"
          >
            <Icon className="size-4 shrink-0" />
            {t(item.name)}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

export function SearchPanel({
  compact = false,
  initialCategory,
  onSearch,
}: {
  compact?: boolean;
  initialCategory?: Category;
  onSearch?: () => void;
}) {
  const { state, setState, t, go, date } = useRBC();
  const [category, setCategory] = useState<Category>(
    initialCategory || state.search.category,
  );
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const search = state.search;
  const road = category === "cars" || category === "motorcycles";
  const displayDate = (value: string) =>
    Number.isFinite(Date.parse(value)) ? date(value) : t("Select dates");
  const chooseCategory = (next: Category) => {
    setCategory(next);
    setError(false);
    setState((current) => ({
      ...current,
      search: {
        ...current.search,
        category: next,
        location: next === "jets" ? "Bangkok" : "Phuket",
        guests: next === "motorcycles" ? 2 : 4,
        packages: [],
      },
    }));
  };
  const quickSearch = () => {
    if (!validateDates(search, category)) {
      setError(true);
      setOpen(true);
      return;
    }
    setState((current) => ({
      ...current,
      search: { ...current.search, category },
    }));
    setError(false);
    onSearch?.();
    go(`search/${category}`);
  };
  return (
    <>
      <div className="hidden lg:block">
        <SearchForm
          compact={compact}
          category={category}
          onCategoryChange={chooseCategory}
          onSearch={onSearch}
        />
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-sm lg:hidden">
        <CategoryPicker category={category} onChange={chooseCategory} />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="mt-3 flex w-full items-center gap-3 rounded-xl border bg-background px-3 py-3 text-left transition-colors hover:bg-secondary"
              aria-label={t("Edit search")}
            >
              <SearchIcon className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <MapPin className="size-3.5 shrink-0" />
                  {t(search.location)}
                </span>
                <span className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
                  <CalendarDays className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {displayDate(search.date)}
                    {road
                      ? ` – ${displayDate(search.returnDate)}`
                      : " · " + t(`${search.guests} guests`)}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                <Pencil className="size-3.5" />
                {t("Edit")}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[90dvh] overflow-y-auto rounded-t-2xl"
          >
            <SheetHeader>
              <SheetTitle>{t("Edit search")}</SheetTitle>
              <SheetDescription>
                {t("Choose your location, dates and travel details.")}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <SearchForm
                compact
                frameless
                category={category}
                onCategoryChange={chooseCategory}
                onSearch={onSearch}
                onComplete={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Button className="mt-3 w-full" size="lg" onClick={quickSearch}>
          <SearchIcon data-icon="inline-start" />
          {t("Search Vehicles")}
        </Button>
        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {t("Return must be after pickup.")}
          </p>
        )}
      </div>
    </>
  );
}
