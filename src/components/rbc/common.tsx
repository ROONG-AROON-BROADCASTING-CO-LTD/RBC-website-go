"use client";

import { useId, type ReactNode, type ComponentProps } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  Heart,
  MapPin,
  Users,
  Ship,
  Bike,
  Car,
  Plane,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { pricing, type Vehicle, type Search } from "@/lib/domain";
import { useRBC } from "./provider";
import { Rating } from "./rating";

export const categoryIcons = {
  boats: Ship,
  motorcycles: Bike,
  cars: Car,
  jets: Plane,
};
export function Photo({
  name,
  alt,
  className,
  priority = false,
  fit = "cover",
  sizes = "(max-width: 768px) 100vw, (max-width:1200px) 50vw, 640px",
}: {
  name: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  sizes?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={`/images/${name}.png`}
        alt={alt}
        fill
        sizes={sizes}
        className={fit === "contain" ? "object-contain" : "object-cover"}
        loading={priority ? "eager" : "lazy"}
      />
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  const { t } = useRBC();
  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      {" "}
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">
            {t(eyebrow)}
          </p>
        )}
        <h1 className="text-3xl font-semibold leading-snug tracking-tight md:text-4xl">
          {t(title)}
        </h1>
        {description && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t(description)}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
export function SectionTitle({
  title,
  description,
  href,
}: {
  title: string;
  description?: string;
  href?: string;
}) {
  const { t } = useRBC();
  return (
    <div className="mb-4 flex items-end justify-between gap-3 md:mb-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {t(title)}
        </h2>
        {description && (
          <p className="mt-2 leading-7 text-muted-foreground">
            {t(description)}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-2 text-sm font-medium text-primary sm:flex"
        >
          {t("Browse all")}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
export function Panel({
  title,
  description,
  children,
  footer,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const { t } = useRBC();
  return (
    <Card
      className={cn(
        "[--card-spacing:--spacing(4)] md:[--card-spacing:--spacing(5)]",
        className,
      )}
    >
      {title && (
        <CardHeader>
          <CardTitle>{t(title)}</CardTitle>
          {description && <CardDescription>{t(description)}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
export function Notice({
  title,
  children,
  error = false,
}: {
  title: string;
  children?: ReactNode;
  error?: boolean;
}) {
  const { t } = useRBC();
  return (
    <Alert variant={error ? "destructive" : "default"}>
      <CircleHelp />
      <AlertTitle>{t(title)}</AlertTitle>
      {children && (
        <AlertDescription>
          {typeof children === "string" ? t(children) : children}
        </AlertDescription>
      )}
    </Alert>
  );
}
export function Status({ value }: { value: string }) {
  const { t } = useRBC();
  return (
    <Badge
      variant={
        ["Cancelled", "Declined"].includes(value)
          ? "destructive"
          : [
                "Confirmed",
                "Approved",
                "Paid",
                "Completed",
                "Available",
                "Accepted",
              ].includes(value)
            ? "default"
            : "secondary"
      }
    >
      {t(value)}
    </Badge>
  );
}
export function TextField({
  label,
  error,
  ...props
}: { label: string; error?: string } & ComponentProps<typeof Input>) {
  const id = useId();
  const { t } = useRBC();
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{t(label)}</FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && <FieldError id={`${id}-error`}>{t(error)}</FieldError>}
    </Field>
  );
}
export function ChoiceField({
  label,
  hideLabel = false,
  value,
  onChange,
  options,
}: {
  label: string;
  hideLabel?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  const id = useId();
  const { t } = useRBC();
  return (
    <Field>
      <FieldLabel htmlFor={id} className={cn(hideLabel && "sr-only")}>
        {t(label)}
      </FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => {
              const item =
                typeof option === "string"
                  ? { value: option, label: option }
                  : option;
              return (
                <SelectItem key={item.value} value={item.value}>
                  {t(item.label)}
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
export function Blank({
  title = "No records yet",
  description = "Your activity will appear here.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useRBC();
  return (
    <Empty className="min-h-64 rounded-2xl border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleHelp />
        </EmptyMedia>
        <EmptyTitle>{t(title)}</EmptyTitle>
        <EmptyDescription>{t(description)}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
export function VehicleCard({
  vehicle: v,
  horizontal = false,
}: {
  vehicle: Vehicle;
  horizontal?: boolean;
}) {
  const { state, setState, t, amount, href } = useRBC();
  const saved = state.saved.includes(v.id);
  return (
    <Card
      className={cn(
        "group relative overflow-hidden py-0 [--card-spacing:--spacing(4)] transition-[transform,box-shadow,border-color] duration-300 hover:border-primary/25 hover:shadow-lg motion-safe:hover:-translate-y-1",
        horizontal && "md:flex-row md:gap-0",
      )}
    >
      <div className={cn("relative", horizontal && "md:w-[38%] md:shrink-0")}>
        <Link
          href={href(`vehicle/${v.id}`)}
          className="block h-full overflow-hidden"
        >
          <Photo
            name={v.img}
            alt={v.name}
            className={cn(
              "aspect-[1.5] h-full transition-transform duration-500 motion-safe:group-hover:scale-105",
              horizontal && "md:aspect-auto md:min-h-64",
            )}
          />
        </Link>
        <Button
          aria-label={t(saved ? "Unsave" : "Save") + " " + v.name}
          aria-pressed={saved}
          variant="secondary"
          size="icon"
          className="absolute right-3 top-3 rounded-full"
          onClick={() =>
            setState((s) => ({
              ...s,
              saved: saved
                ? s.saved.filter((id) => id !== v.id)
                : [...s.saved, v.id],
            }))
          }
        >
          <Heart className={cn(saved && "fill-coral text-coral")} />
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <CardHeader className="gap-2 pt-4">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 text-ocean" />
            {t(v.location)}
            <Rating score={v.rating} className="ml-auto" />
          </div>
          <CardTitle className="text-lg leading-snug">
            <Link href={href(`vehicle/${v.id}`)}>{v.name}</Link>
          </CardTitle>
          <CardDescription>{t(v.spec)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2 pt-0 text-sm">
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-1">
              <Users className="size-4 text-lavender" />
              {t(`${v.capacity} guests`)}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="size-4 text-ocean" />
              {t(v.service)}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground">{v.provider}</p>
        </CardContent>
        <CardFooter className="mt-auto flex items-end justify-between gap-3 border-t py-3">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "mb-1.5 w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                v.mode === "quote"
                  ? "bg-lavender-soft text-lavender"
                  : "bg-ocean-soft text-ocean",
              )}
            >
              {t(
                v.mode === "quote"
                  ? "Subject to confirmation"
                  : "Instant booking",
              )}
            </p>
            <p className="text-xl font-semibold leading-tight text-primary">
              {v.price ? amount(v.price) : t("Request a Quote")}{" "}
              {v.price > 0 && (
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  / {t(v.unit)}
                </span>
              )}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link
              href={href(`vehicle/${v.id}`)}
              aria-label={t("View Details") + " " + v.name}
            >
              {t("View Details")}
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}
export function PriceBreakdown({
  vehicle,
  search,
  quotedRental,
}: {
  vehicle: Vehicle;
  search: Search;
  quotedRental?: number;
}) {
  const { t, amount } = useRBC();
  const p = pricing(vehicle, search, quotedRental);
  return (
    <div className="flex flex-col gap-4 text-sm">
      {[
        ["Rental", p.rental],
        ["Extras", p.extras],
        ["Service fee", p.fee],
        ["Taxes", p.tax],
      ].map(([name, value]) => (
        <div key={name} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{t(String(name))}</span>
          <span>{amount(Number(value))}</span>
        </div>
      ))}
      <Separator />
      <div className="flex justify-between gap-3 text-lg font-semibold">
        <span>{t("Total")}</span>
        <span>{amount(p.total)}</span>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        {t("All amounts are illustrative.")}
      </p>
      <div className="rounded-xl bg-muted p-4">
        <div className="flex justify-between gap-3">
          <span>{t("Security deposit")}</span>
          <strong>{amount(vehicle.deposit)}</strong>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {t(
            "Collected separately at handover. Not included in the booking total.",
          )}
        </p>
      </div>
    </div>
  );
}
