"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTranslator } from "@/lib/i18n";
export function FinanceSelect({
  name,
  value,
  options,
  label,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  const router = useRouter();
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const url = new URL(window.location.href);
        url.searchParams.set(name, next);
        url.searchParams.delete("page");
        router.push(url.pathname + url.search);
      }}
    >
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
export function FinanceRefresh({ locale }: { locale: string }) {
  const router = useRouter(),
    t = createTranslator(locale);
  useEffect(() => {
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        !document.activeElement?.matches(
          "input,textarea,select,[role=combobox]",
        )
      )
        router.refresh();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);
  return (
    <p className="text-xs text-muted-foreground">
      {t("Gateway-confirmed payments · updates every 30 seconds")}
    </p>
  );
}
