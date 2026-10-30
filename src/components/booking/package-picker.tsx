"use client";

import { Package, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { bookingPackages } from "@/lib/booking-packages";
import type { Category } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useRBC } from "@/components/rbc/provider";

export function PackagePicker({
  category,
  selected,
  onChange,
}: {
  category: Category;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t, amount } = useRBC();
  return (
    <div className="flex flex-col gap-4">
      {bookingPackages(category).map((item) => {
        const checked = selected.includes(item.id);
        return (
          <Field
            key={item.id}
            orientation="horizontal"
            className={cn(
              "relative rounded-2xl border p-5 transition-colors",
              checked ? "border-primary bg-primary/5" : "bg-card",
            )}
          >
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                checked
                  ? "bg-primary text-primary-foreground"
                  : "bg-ocean-soft text-ocean",
              )}
            >
              {checked ? (
                <Check className="size-5" />
              ) : (
                <Package className="size-5" />
              )}
            </span>
            <FieldLabel
              htmlFor={`package-${item.id}`}
              className="flex min-w-0 flex-1 flex-col items-start gap-2"
            >
              <span className="font-semibold">{t(item.name)}</span>
              <span className="text-xs font-normal leading-6 text-muted-foreground">
                {t(item.description)}
              </span>
              <span className="font-semibold text-primary">
                + {amount(item.price)}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  / {t("per booking")}
                </span>
              </span>
            </FieldLabel>
            <Checkbox
              id={`package-${item.id}`}
              checked={checked}
              onCheckedChange={(value) =>
                onChange(
                  value === true
                    ? [...selected, item.id]
                    : selected.filter((id) => id !== item.id),
                )
              }
            />
          </Field>
        );
      })}
      <p className="text-xs leading-6 text-muted-foreground">
        {t("Packages are optional. You can continue without adding one.")}
      </p>
    </div>
  );
}
