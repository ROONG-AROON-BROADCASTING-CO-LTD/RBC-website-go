"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  categories,
  wizardSteps,
  type Listing,
  type Category,
} from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useRBC } from "@/components/rbc/provider";
import {
  PageHeading,
  Panel,
  TextField,
  ChoiceField,
  Notice,
} from "@/components/rbc/common";
import { AvailabilityCalendar } from "./availability-calendar";
import { FilePicker } from "./file-picker";

export default function ListingWizard({ step }: { step: number }) {
  const { state, setState, t, go } = useRBC();
  const [error, setError] = useState("");
  const listing: Listing = state.partner.listing || {
    category: "boats",
    name: "",
    capacity: 4,
    photos: [],
    location: "Phuket",
    price: 0,
    service: "Skipper & crew included",
    policy: "Free cancellation up to 48 hours before departure.",
    status: "Draft",
  };
  const patch = (key: keyof Listing, value: Listing[keyof Listing]) =>
    setState((s) => ({
      ...s,
      partner: {
        ...s.partner,
        listing: { ...listing, [key]: value, status: "Draft" },
      },
    }));
  const validate = (s: number) =>
    s === 1
      ? !!listing.name.trim() && listing.capacity > 0
      : s === 2
        ? listing.photos.length > 0
        : s === 4
          ? listing.price > 0
          : s === 6
            ? !!listing.policy.trim()
            : true;
  const next = () => {
    if (!validate(step)) {
      setError("Please complete the required fields.");
      return;
    }
    if (step === 7) {
      const missing = [1, 2, 4, 6].find((n) => !validate(n));
      if (missing !== undefined) {
        go(`wizard/${missing}`);
        return;
      }
      setState((s) => ({
        ...s,
        partner: {
          ...s.partner,
          listing: { ...listing, status: "Pending approval" },
        },
        activity: ["Listing submitted", ...s.activity],
      }));
      go("partner/listings");
    } else {
      setState((s) => ({ ...s, partner: { ...s.partner, listing } }));
      go(`wizard/${step + 1}`);
    }
  };
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-5 md:py-8">
      <PageHeading
        eyebrow={`RBC GO · ${step + 1}/8`}
        title="Create your listing"
        description={wizardSteps[step]}
      />
      <div className="mb-8 grid grid-cols-4 gap-2 md:grid-cols-8">
        {wizardSteps.map((name, i) => (
          <div
            key={name}
            className={cn(
              "rounded-xl border p-3 text-center text-xs",
              i === step
                ? "border-primary bg-primary text-primary-foreground"
                : i < step
                  ? "bg-secondary"
                  : "bg-card",
            )}
          >
            <span className="mb-2 block text-lg">{i < step ? "✓" : i + 1}</span>
            {t(name)}
          </div>
        ))}
      </div>
      <Panel title={wizardSteps[step]}>
        <FieldGroup>
          {step === 0 && (
            <ChoiceField
              label="Category"
              value={listing.category}
              onChange={(v) => patch("category", v as Category)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
          {step === 1 && (
            <>
              <TextField
                label="Listing name"
                required
                value={listing.name}
                onChange={(e) => patch("name", e.target.value)}
              />
              <TextField
                label="Passenger capacity"
                type="number"
                min={1}
                max={200}
                required
                value={listing.capacity}
                onChange={(e) => patch("capacity", Number(e.target.value))}
              />
              <ChoiceField
                label="Service"
                value={listing.service}
                onChange={(v) => patch("service", v)}
                options={[
                  "Skipper & crew included",
                  "Self-drive",
                  "Chauffeur",
                  "Flight crew included",
                ]}
              />
            </>
          )}
          {step === 2 && (
            <FilePicker
              id="listing-photos"
              label="Photo files"
              kind="photos"
              files={listing.photos}
              onFilesChange={(names) => patch("photos", names)}
            >
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={() => patch("photos", ["rbc-go-sample-photo.png"])}
              >
                {t("Use sample photo")}
              </Button>
            </FilePicker>
          )}
          {step === 3 && (
            <ChoiceField
              label="Location"
              value={listing.location}
              onChange={(v) => patch("location", v)}
              options={["Phuket", "Bangkok", "Koh Samui", "Chiang Mai"]}
            />
          )}
          {step === 4 && (
            <>
              <TextField
                label="Price (THB)"
                type="number"
                min={1}
                required
                value={listing.price || ""}
                onChange={(e) => patch("price", Number(e.target.value))}
              />
              <Notice title="All amounts are illustrative." />
            </>
          )}
          {step === 5 && <AvailabilityCalendar />}
          {step === 6 && (
            <Field>
              <FieldLabel htmlFor="listing-policy">
                {t("Cancellation terms")}
              </FieldLabel>
              <Textarea
                id="listing-policy"
                className="min-h-32"
                required
                value={listing.policy}
                onChange={(e) => patch("policy", e.target.value)}
              />
            </Field>
          )}
          {step === 7 && (
            <>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {[
                  ["Listing name", listing.name],
                  [
                    "Category",
                    categories.find((c) => c.id === listing.category)!.name,
                  ],
                  ["Location", listing.location],
                  ["Price (THB)", String(listing.price)],
                  ["Passenger capacity", String(listing.capacity)],
                  ["Photos", String(listing.photos.length)],
                ].map(([name, value]) => (
                  <div key={name}>
                    <dt className="mb-1 text-muted-foreground">{t(name)}</dt>
                    <dd>{t(value)}</dd>
                  </div>
                ))}
              </dl>
              <Notice title="Pending approval">
                Partner approval is required first.
              </Notice>
            </>
          )}
          {error && <Notice title={error} error />}
          <div className="mt-4 flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() =>
                step ? go(`wizard/${step - 1}`) : go("partner/listings")
              }
            >
              <ArrowLeft data-icon="inline-start" />
              {t("Back")}
            </Button>
            <Button onClick={next}>
              {t(step === 7 ? "Submit listing" : "Continue")}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </FieldGroup>
      </Panel>
    </div>
  );
}
