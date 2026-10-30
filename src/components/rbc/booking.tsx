"use client";
import Link from "next/link";
import { selectedPackages } from "@/lib/booking-packages";
import type { Category } from "@/lib/domain";
import { CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { vehicleById, type Booking, type Traveler } from "@/lib/domain";
import { useRBC } from "./provider";
import { Panel, TextField, Notice, Status, Photo, Blank } from "./common";
export function travelerErrors(traveler: Traveler) {
  return {
    name: traveler.name.trim() ? "" : "Please complete the required fields.",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(traveler.email)
      ? ""
      : "Please enter a valid email address.",
    phone:
      traveler.phone.replace(/\D/g, "").length >= 8
        ? ""
        : "Please complete the required fields.",
  };
}
export function TravelerFields({ errors = false }: { errors?: boolean }) {
  const { state, setState } = useRBC();
  const e = travelerErrors(state.traveler);
  return (
    <FieldGroup className="grid gap-5 sm:grid-cols-2">
      {(["name", "email", "phone"] as const).map((key) => (
        <TextField
          key={key}
          label={
            key === "name"
              ? "Full name"
              : key === "email"
                ? "Email"
                : "Phone number"
          }
          autoComplete={
            key === "name" ? "name" : key === "email" ? "email" : "tel"
          }
          type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
          required
          value={state.traveler[key]}
          error={errors ? e[key] : undefined}
          onChange={(event) =>
            setState((s) => ({
              ...s,
              traveler: { ...s.traveler, [key]: event.target.value },
            }))
          }
        />
      ))}
    </FieldGroup>
  );
}
export function downloadReceipt(booking: Booking, t: (s: string) => string) {
  const v = vehicleById(booking.vehicleId)!;
  const text = [
    "RBC GO · " + t("Sample receipt"),
    booking.id,
    v.name,
    t("Full name") + ": " + booking.traveler.name,
    t("Payment status") + ": " + t(booking.payment),
    t("Payment method") + ": " + t(booking.paymentMethod || "Card"),
    ...selectedPackages(v.cat as Category, booking.search.packages).map(
      (item) => t(item.name) + ": THB " + item.price,
    ),
    t("Booking status") + ": " + t(booking.status),
    t("Total") + ": THB " + booking.total.toLocaleString("en-US"),
    t("Security deposit") + ": THB " + booking.deposit.toLocaleString("en-US"),
    t("Local demo · No real payments"),
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${booking.id}-receipt.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(t("Receipt downloaded"));
}
export function Confirmation({ bookingId }: { bookingId?: string } = {}) {
  const { state, t, href, amount, date } = useRBC();
  const booking = bookingId
    ? state.bookings.find((item) => item.id === bookingId)
    : state.bookings[0];
  if (!booking)
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-5 md:py-8">
        <Blank
          title="No booking to display"
          action={
            <Button asChild>
              <Link href={href()}>{t("Start exploring")}</Link>
            </Button>
          }
        />
      </div>
    );
  const v = vehicleById(booking.vehicleId)!;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-5 md:py-8">
      <div className="mb-8 text-center">
        <CheckCircle2 className="mx-auto mb-5 size-14 text-primary" />
        <h1 className="text-3xl font-semibold">
          {t(
            booking.status === "Confirmed"
              ? "Your booking is confirmed"
              : "Payment received",
          )}
        </h1>
        <p className="mt-4 text-muted-foreground">{booking.id}</p>
      </div>
      <Panel title={v.name}>
        <Photo
          name={v.img}
          alt={v.name}
          className="mb-6 aspect-[1.9] rounded-xl"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              {t("Booking status")}
            </p>
            <Status value={booking.status} />
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              {t("Payment status")}
            </p>
            <Status value={booking.payment} />
          </div>
          <p>{date(booking.search.date)}</p>
          <p className="text-right text-xl font-semibold">
            {amount(booking.total)}
          </p>
        </div>
        {booking.paymentMethod && (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("Payment method")}: {t(booking.paymentMethod)}
          </p>
        )}
        {selectedPackages(v.cat as Category, booking.search.packages).length >
          0 && (
          <div className="mt-5 rounded-xl bg-ocean-soft p-4">
            <p className="mb-3 text-sm font-semibold text-ocean">
              {t("Selected packages")}
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {selectedPackages(v.cat as Category, booking.search.packages).map(
                (item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>{t(item.name)}</span>
                    <span>{amount(item.price)}</span>
                  </li>
                ),
              )}
            </ul>
          </div>
        )}
        {booking.status === "Awaiting confirmation" && (
          <div className="mt-6">
            <Notice title="Next step">
              Payment does not confirm your booking until availability is
              secured.
            </Notice>
          </div>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={href("account/bookings")}>{t("My Bookings")}</Link>
          </Button>
          <Button variant="outline" onClick={() => downloadReceipt(booking, t)}>
            <Download data-icon="inline-start" />
            {t("Download receipt")}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
