"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUp,
  Menu,
  Search,
  Heart,
  CalendarDays,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { categories, searchCategoryForPath } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useRBC } from "@/components/rbc/provider";
import { useCustomerAuth } from "@/components/customer/auth/provider";
import { LanguageSwitcher } from "./language-switcher";

export function Navbar() {
  const { t, href, go, state } = useRBC();
  const { customer, openAuth } = useCustomerAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const isHome = pathname === href();
  const glass = scrolled || !isHome;
  const internalWorkspace = /^\/(th|en|zh)\/(partner|operations)(\/|$)/.test(
    pathname,
  );
  const searchCategory = searchCategoryForPath(pathname, state.search.category);
  const mainLinks = [
    { name: "Home", path: "", active: isHome },
    {
      name: "Search Vehicles",
      path: `search/${searchCategory}`,
      active: /^\/(th|en|zh)\/(search|vehicle|checkout|request)(\/|$)/.test(
        pathname,
      ),
    },
    {
      name: "Trips & Experiences",
      path: "experiences",
      active: /^\/(th|en|zh)\/(experiences|experience)(\/|$)/.test(pathname),
    },
  ];
  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 transition-colors duration-200",
          glass
            ? "bg-white/90 text-navy backdrop-blur-md"
            : "bg-transparent text-white",
        )}
      >
        <div className="mx-auto flex h-20 max-w-[1440px] items-center gap-3 px-4 md:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Link
            href={href()}
            aria-label="RBC GO"
            className="mr-auto shrink-0 font-serif text-2xl font-bold tracking-tight lg:mr-0 lg:text-[28px]"
          >
            RBC GO
          </Link>
          <nav
            aria-label={t("Main navigation")}
            className={cn(
              "hidden items-center rounded-full border p-1 text-base lg:inline-flex",
              glass
                ? "border-navy/10 bg-[#e9edf3]"
                : "border-white/25 bg-white/10",
            )}
          >
            {mainLinks.map((link) => (
              <Link
                key={link.name}
                aria-current={link.active ? "page" : undefined}
                className={cn(
                  "rounded-full px-6 py-3 whitespace-nowrap transition-colors focus-visible:rounded-full focus-visible:outline-offset-2",
                  link.active
                    ? glass
                      ? "bg-navy font-semibold text-white shadow-sm hover:bg-navy/90"
                      : "bg-white font-semibold text-navy shadow-sm hover:bg-white"
                    : glass
                      ? "text-navy hover:bg-white/80"
                      : "text-white/85 hover:bg-white/15",
                )}
                href={href(link.path)}
              >
                {t(link.name)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 lg:ml-0 lg:justify-end">
            <LanguageSwitcher darkText={glass} />
            {customer ? (
              <Button
                className={cn(
                  "hidden min-w-32 rounded-xl font-semibold md:inline-flex",
                  glass
                    ? "bg-navy text-white hover:bg-navy/90"
                    : "bg-white text-navy hover:bg-white/90",
                )}
                onClick={() => go("account/profile")}
              >
                {t("My account")}
              </Button>
            ) : (
              <Button
                className={cn(
                  "hidden min-w-32 rounded-xl font-semibold md:inline-flex",
                  glass
                    ? "bg-navy text-white hover:bg-navy/90"
                    : "bg-white text-navy hover:bg-white/90",
                )}
                onClick={() => openAuth("login")}
              >
                {t("Sign In")}
              </Button>
            )}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "lg:hidden",
                  glass
                    ? "text-navy hover:bg-navy/10 hover:text-navy"
                    : "text-white hover:bg-white/10 hover:text-white",
                )}
                aria-label={t("Menu")}
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>RBC GO</SheetTitle>
                <SheetDescription>
                  {t("Your journey. By road, sea, or sky.")}
                </SheetDescription>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 px-5 pt-4">
                {customer ? (
                  <SheetClose asChild>
                    <Button variant="outline" className="col-span-2" asChild>
                      <Link href={href("account/profile")}>
                        {t("My account")}
                      </Link>
                    </Button>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button onClick={() => openAuth("login")}>
                        {t("Sign In")}
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        onClick={() => openAuth("register")}
                      >
                        {t("Register")}
                      </Button>
                    </SheetClose>
                  </>
                )}
              </div>
              <nav className="flex flex-col gap-2 p-5">
                {[
                  { name: "Home", path: "" },
                  { name: "Search Vehicles", path: `search/${searchCategory}` },
                  { name: "Trips & Experiences", path: "experiences" },
                  ...categories.map((c) => ({
                    name: c.name,
                    path: `search/${c.id}`,
                  })),
                  { name: "My Bookings", path: "account/bookings" },
                  { name: "Become a Partner", path: "apply" },
                  { name: "Help", path: "help" },
                  ...(internalWorkspace
                    ? [{ name: "Design guide", path: "guide" }]
                    : []),
                ].map((link) => (
                  <SheetClose key={`${link.name}-${link.path}`} asChild>
                    <Link
                      className="rounded-xl p-3 text-sm hover:bg-accent"
                      href={href(link.path)}
                    >
                      {t(link.name)}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      {scrolled && (
        <button
          type="button"
          aria-label={t("Back to top")}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 flex size-11 items-center justify-center rounded-full bg-navy text-white shadow-lg transition-colors hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:bottom-6 md:right-6"
        >
          <ArrowUp className="size-5" />
        </button>
      )}
    </>
  );
}

export function MobileNavbar() {
  const { t, href, state } = useRBC();
  const { customer, openAuth } = useCustomerAuth();
  const pathname = usePathname();
  const category = searchCategoryForPath(pathname, state.search.category);
  return (
    <nav
      aria-label={t("Mobile navigation")}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {[
        [Search, "Search", "search/" + category],
        [Heart, "Saved", "account/saved"],
        [CalendarDays, "Bookings", "account/bookings"],
        [UserRound, "Account", "account/profile"],
      ].map(([Icon, label, url]) => {
        const I = Icon as typeof Search;
        const active = String(url).startsWith("search/")
          ? /^\/(th|en|zh)\/(search|vehicle|checkout)(\/|$)/.test(pathname)
          : url === "account/profile"
            ? /\/account\/(profile|payments|messages)(\/|$)/.test(pathname)
            : pathname.startsWith(href(String(url)));
        if (url === "account/profile" && !customer) {
          return (
            <button
              key={String(url)}
              type="button"
              onClick={() => openAuth("login", "account/profile")}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-16 min-w-16 flex-col items-center justify-center gap-1 px-2 text-[11px]",
                active ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              <I className="size-5" />
              {t(String(label))}
            </button>
          );
        }
        return (
          <Link
            key={String(url)}
            href={href(String(url))}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-16 min-w-16 flex-col items-center justify-center gap-1 rounded-lg px-2 text-[11px]",
              active ? "font-semibold text-primary" : "text-muted-foreground",
            )}
          >
            <I className="size-5" />
            {t(String(label))}
          </Link>
        );
      })}
    </nav>
  );
}
