import type { Category } from "./domain";

export const partnerRentalCategories = [
  { id: "cars", label: "Cars and vans" },
  { id: "motorcycles", label: "Motorcycles" },
  { id: "boats", label: "Boats & Yachts" },
  { id: "jets", label: "Aircraft and private jets" },
] as const satisfies readonly { id: Category; label: string }[];

export function parsePartnerCategories(
  values: readonly unknown[],
): Category[] | null {
  if (
    !values.length ||
    values.some(
      (value) => !partnerRentalCategories.some(({ id }) => id === value),
    )
  )
    return null;
  return partnerRentalCategories
    .filter(({ id }) => values.includes(id))
    .map(({ id }) => id);
}

export function partnerCategoryLabel(category: string) {
  return (
    partnerRentalCategories.find(({ id }) => id === category)?.label ?? category
  );
}
