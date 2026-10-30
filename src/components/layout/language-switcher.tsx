"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useRBC } from "@/components/rbc/provider";
import type { Locale } from "@/lib/domain";
import { cn } from "@/lib/utils";

const languages: { code: Locale; flag: string; name: string }[] = [
  { code: "th", flag: "🇹🇭", name: "ภาษาไทย" },
  { code: "en", flag: "🇺🇸", name: "English" },
  { code: "zh", flag: "🇨🇳", name: "简体中文" },
];

const dialogCopy: Record<Locale, { title: string; description: string }> = {
  th: {
    title: "เลือกภาษาที่ต้องการ",
    description: "เลือกภาษาสำหรับแสดงเนื้อหาบนเว็บไซต์",
  },
  en: {
    title: "Choose your language",
    description: "Choose the language used on this website.",
  },
  zh: {
    title: "选择语言",
    description: "选择网站显示语言。",
  },
};

export function LanguageSwitcher({ darkText = false }: { darkText?: boolean }) {
  const { locale, t } = useRBC();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const selected = languages.find((language) => language.code === locale)!;

  function changeLanguage(language: string) {
    if (language !== "th" && language !== "en" && language !== "zh") return;
    setOpen(false);
    if (language !== locale) {
      router.replace(
        pathname.replace(/^\/(th|en|zh)(?=\/|$)/, `/${language}`),
        {
          scroll: false,
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("Language")}
          className={cn(
            "size-11 shrink-0 rounded-full border border-transparent p-0 text-2xl leading-none",
            darkText
              ? "hover:bg-navy/5 focus-visible:ring-navy/25"
              : "hover:bg-white/15 focus-visible:ring-white/50",
          )}
        >
          <span role="img" aria-label={selected.name}>
            {selected.flag}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,880px)] max-w-none gap-6 rounded-3xl bg-white p-6 text-navy shadow-2xl sm:max-w-none sm:p-8">
        <DialogHeader>
          <DialogTitle className="pr-10 text-2xl font-bold leading-snug sm:text-3xl">
            {dialogCopy[locale].title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {dialogCopy[locale].description}
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <ToggleGroup
          type="single"
          value={locale}
          onValueChange={changeLanguage}
          aria-label={dialogCopy[locale].title}
          className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {languages.map((language) => (
            <ToggleGroupItem
              key={language.code}
              value={language.code}
              aria-label={language.name}
              className="flex min-h-20 w-full justify-start gap-3 rounded-2xl border border-navy/10 bg-white px-4 py-3 text-left text-base font-medium text-navy shadow-none hover:bg-navy/5 data-[state=on]:border-navy data-[state=on]:bg-navy/5 data-[state=on]:text-navy"
            >
              <Check
                aria-hidden="true"
                className={cn(
                  "size-5 shrink-0 text-primary",
                  locale !== language.code && "invisible",
                )}
              />
              <span className="text-3xl leading-none" aria-hidden="true">
                {language.flag}
              </span>
              <span>{language.name}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </DialogContent>
    </Dialog>
  );
}
