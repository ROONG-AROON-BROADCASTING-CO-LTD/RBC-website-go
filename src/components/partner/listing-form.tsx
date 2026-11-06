"use client";
import { useRBC } from "@/components/rbc/provider";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  submitListing,
  type ListingFormResult,
} from "@/app/[locale]/partner/overview/actions";
import type { PartnerListing } from "@/lib/server/listings";
const initial: ListingFormResult = { error: "" };
const errors: Record<string, string> = {
  invalid_category: "Choose a vehicle category.",
  invalid_title: "Enter a listing title of 2\u2013200 characters.",
  invalid_description: "Enter a location and check the description length.",
  invalid_capacity: "Passenger capacity must be between 1 and 200.",
  invalid_price: "Enter a valid price.",
  images_required: "Choose 1\u20135 images.",
  images_too_large: "Images must not exceed 10 MB in total.",
  invalid_image_type: "Only JPG, PNG and WebP are supported.",
  invalid_image_size: "Each image must be 5 MB or smaller.",
  invalid_image_name: "Invalid image name.",
  invalid_listing: "Listing not found.",
  listing_locked: "This listing cannot be edited in its current state.",
};
export function ListingForm({
  locale,
  listing,
}: {
  locale: string;
  listing?: PartnerListing;
}) {
  const { t } = useRBC();
  const [state, action, pending] = useActionState(submitListing, initial);
  return (
    <form
      action={action}
      className="partner-listing-form flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-sm md:p-8"
    >
      <input type="hidden" name="locale" value={locale} />
      {listing && <input type="hidden" name="listingId" value={listing.id} />}
      <h2 className="text-xl font-bold">
        {listing ? t("Edit vehicle listing") : t("Add a vehicle")}
      </h2>
      <p className="text-sm text-muted-foreground">
        {listing
          ? t(
              "Update the requested details and resubmit this listing for review.",
            )
          : t("New listings are reviewed before publication.")}
      </p>
      <label className="block text-sm font-semibold">
        {t("Category")}
        <select
          name="category"
          required
          defaultValue={listing?.category ?? ""}
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
        >
          <option value="" disabled>
            {t("Choose a category")}
          </option>
          <option value="boats">{t("Boats and yachts")}</option>
          <option value="motorcycles">{t("Motorcycles")}</option>
          <option value="cars">{t("Cars")}</option>
          <option value="jets">{t("Private jets")}</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">
        {t("Listing title")}
        <Input
          name="title"
          defaultValue={listing?.title}
          required
          minLength={2}
          maxLength={200}
          className="mt-2"
        />
      </label>
      <label className="block text-sm font-semibold">
        {t("Location")}
        <Input
          name="location"
          defaultValue={listing?.location_text}
          required
          maxLength={200}
          className="mt-2"
        />
      </label>
      <label className="block text-sm font-semibold">
        {t("Description")}
        <textarea
          name="description"
          defaultValue={listing?.description}
          rows={3}
          maxLength={5000}
          className="mt-2 w-full rounded-lg border bg-background p-3"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-semibold">
          {t("Passenger capacity")}
          <Input
            name="capacity"
            defaultValue={listing?.capacity}
            type="number"
            min={1}
            max={200}
            required
            className="mt-2"
          />
        </label>
        <label className="block text-sm font-semibold">
          {t("Starting price (THB)")}
          <Input
            name="price"
            defaultValue={
              listing
                ? (Number(listing.base_price_satang) / 100).toFixed(2)
                : undefined
            }
            type="number"
            min="0.01"
            step="0.01"
            required
            className="mt-2"
          />
        </label>
        <label className="block text-sm font-semibold">
          {t("Security deposit (THB)")}
          <Input
            name="deposit"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              listing ? (Number(listing.deposit_satang) / 100).toFixed(2) : "0"
            }
            className="mt-2"
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        {t("Vehicle images")}
        <Input
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required={!listing}
          className="mt-2 h-auto py-3"
        />
        <span className="mt-2 block text-xs font-normal text-muted-foreground">
          {listing
            ? t(
                "Leave empty to keep existing images, or choose 1\u20135 replacements, up to 10 MB in total.",
              )
            : t("1\u20135 images, up to 10 MB in total.")}
        </span>
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {errors[state.error] ??
            t("Unable to submit the listing. Please try again.")}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending
          ? t("Sending...")
          : listing
            ? t("Resubmit for review")
            : t("Submit listing for review")}
      </Button>
    </form>
  );
}
