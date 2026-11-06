"use client";

import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { partnerRentalCategories } from "@/lib/partner-categories";
import type { Category } from "@/lib/domain";

export function PartnerCategorySelect({
  value,
  onChange,
  invalid,
  t,
}: {
  value: Category[];
  onChange: (value: Category[]) => void;
  invalid: boolean;
  t: (text: string) => string;
}) {
  const selected = partnerRentalCategories.filter(({ id }) =>
    value.includes(id),
  );
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel id="partner-categories-label" htmlFor="partner-categories">
        {t("What would you like to offer for rent?")}
      </FieldLabel>
      {selected.map(({ id }) => (
        <input key={id} type="hidden" name="rentalCategories" value={id} />
      ))}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            id="partner-categories"
            variant="outline"
            className="h-auto min-h-11 w-full justify-between whitespace-normal text-left"
            aria-labelledby="partner-categories-label partner-categories-value"
            aria-describedby="partner-categories-help"
            aria-invalid={invalid || undefined}
          >
            <span id="partner-categories-value">
              {selected.length
                ? selected.map(({ label }) => t(label)).join(" · ")
                : t("Select rental categories")}
            </span>
            <ChevronDown data-icon="inline-end" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg"
          >
            <DropdownMenu.Group aria-labelledby="partner-categories-label">
              {partnerRentalCategories.map(({ id, label }) => (
                <DropdownMenu.CheckboxItem
                  key={id}
                  checked={value.includes(id)}
                  onCheckedChange={(checked) =>
                    onChange(
                      checked
                        ? [...value, id]
                        : value.filter((item) => item !== id),
                    )
                  }
                  onSelect={(event) => event.preventDefault()}
                  className="relative flex cursor-pointer items-center rounded-lg py-3 pr-3 pl-9 text-sm outline-none focus:bg-accent"
                >
                  <span className="absolute left-3 flex size-4 items-center justify-center rounded border">
                    <DropdownMenu.ItemIndicator>
                      <Check className="size-3" />
                    </DropdownMenu.ItemIndicator>
                  </span>
                  {t(label)}
                </DropdownMenu.CheckboxItem>
              ))}
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <FieldDescription id="partner-categories-help">
        {t(
          "Select all that apply. One person or company can offer several vehicle types; the document list below follows your selection.",
        )}
      </FieldDescription>
      {invalid && (
        <p role="alert" className="text-sm text-destructive">
          {t("Select at least one rental category.")}
        </p>
      )}
    </Field>
  );
}
