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
  LogOut,
  BriefcaseBusiness,
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
import { accountAreaForPath } from "@/lib/account-area";
import { useRBC } from "@/components/rbc/provider";
import { useCustomerAuth } from "@/components/customer/auth/provider";
import { LanguageSwitcher } from "./language-switcher";
import { AccountMenu } from "@/components/customer/account-menu";
import {
  accountPrimaryLinks,
  partnerAccountLinks,
} from "@/components/customer/account-navigation";

export function Navbar() {
  const { t, href, state } = useRBC();
  const { customer, openAuth, signOut } = useCustomerAuth();
  const pathname = usePathname();
  const isPartner = accountAreaForPath(pathname) === "partner";
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const isHome = pathname === href();
  const glass = scrolled || !isHome;
  const alternateArea = isPartner
    ? {
        path: customer ? "account/profile" : "email",
        label: customer ? "Customer account" : "Customer sign in",
        icon: UserRound,
      }
    : {
        path: customer ? "partner/overview" : "partner-login",
        label: customer ? "Partner area" : "Partner sign in",
        icon: BriefcaseBusiness,
      };
  const AlternateIcon = alternateArea.icon;
  const currentAccountLinks = isPartner
    ? partnerAccountLinks
    : accountPrimaryLinks.map(({ id, ...link }) => ({
        ...link,
        path: `account/${id}`,
      }));
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
        <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center gap-3 px-4 md:px-6 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Link
            href={href()}
            aria-label="RBC GO"
            className="mr-auto shrink-0 font-serif text-2xl font-bold tracking-tight xl:mr-0 xl:justify-self-start xl:text-[28px]"
          >
            <span className="flex flex-col">
              RBC GO
              {isPartner && (
                <span className="font-sans text-[10px] tracking-[0.2em]">
                  PARTNERS
                </span>
              )}
            </span>
          </Link>
          <nav
            aria-label={t("Main navigation")}
            className={cn(
              "hidden items-center rounded-full border p-1 text-base xl:inline-flex",
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
          <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0 xl:justify-self-end">
            <LanguageSwitcher darkText={glass} />
            <Button
              variant="ghost"
              className={cn(
                "hidden md:inline-flex",
                glass
                  ? "text-navy hover:bg-navy/10 hover:text-navy"
                  : "text-white hover:bg-white/10 hover:text-white",
              )}
              asChild
            >
              <Link href={href(alternateArea.path)}>
                <AlternateIcon data-icon="inline-start" />
                {t(alternateArea.label)}
              </Link>
            </Button>
            {customer ? (
              <AccountMenu
                glass={glass}
                area={isPartner ? "partner" : "customer"}
              />
            ) : isPartner ? (
              <Button className="hidden md:inline-flex" asChild>
                <Link href={href("partner-login")}>{t("Partner sign in")}</Link>
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
                {t("Customer sign in")}
              </Button>
            )}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "xl:hidden",
                  glass
                    ? "text-navy hover:bg-navy/10 hover:text-navy"
                    : "text-white hover:bg-white/10 hover:text-white",
                )}
                aria-label={t("Menu")}
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto data-[side=right]:w-[min(100vw,24rem)]">
              <SheetHeader>
                <SheetTitle>
                  {isPartner ? "RBC GO PARTNERS" : "RBC GO"}
                </SheetTitle>
                <SheetDescription>
                  {t(
                    isPartner
                      ? "List vehicles and manage rental requests."
                      : "Book vehicles and manage your trips.",
                  )}
                </SheetDescription>
              </SheetHeader>
              {customer && (
                <div className="mx-5 rounded-xl bg-muted p-3">
                  <p className="truncate font-semibold">{customer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {customer.email || t("My account")}
                  </p>
                </div>
              )}
              <section
                className="flex flex-col gap-3 px-5 pt-4"
                aria-label={t(isPartner ? "Partner area" : "Customer account")}
              >
                <h2 className="text-sm font-semibold">
                  {t(isPartner ? "Partner area" : "Customer account")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t(
                    isPartner
                      ? "List vehicles and manage rental requests."
                      : "Book vehicles and manage your trips.",
                  )}
                </p>
                {!customer &&
                  (isPartner ? (
                    <>
                      <SheetClose asChild>
                        <Button asChild>
                          <Link href={href("partner-login")}>
                            {t("Partner sign in")}
                          </Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button variant="outline" asChild>
                          <Link href={href("partner-signup")}>
                            {t("Register as a partner")}
                          </Link>
                        </Button>
                      </SheetClose>
                    </>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <Button onClick={() => openAuth("login")}>
                          {t("Customer sign in")}
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button
                          variant="outline"
                          onClick={() => openAuth("register")}
                        >
                          {t("Create a customer account")}
                        </Button>
                      </SheetClose>
                    </>
                  ))}
                {customer && (
                  <div className="flex flex-col gap-2">
                    <nav
                      aria-label={t(
                        isPartner ? "Partner account" : "Customer account",
                      )}
                      className="flex flex-col gap-1"
                    >
                      {currentAccountLinks.map(
                        ({ path, label, icon: Icon }) => (
                          <SheetClose key={path} asChild>
                            <Link
                              href={href(path)}
                              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent"
                            >
                              <Icon className="size-4 text-muted-foreground" />
                              {t(label)}
                            </Link>
                          </SheetClose>
                        ),
                      )}
                    </nav>
                  </div>
                )}
              </section>
              <section
                className="mx-5 mt-4 flex flex-col gap-3 rounded-xl border p-4"
                aria-label={t(isPartner ? "Customer account" : "Partner area")}
              >
                <h2 className="text-sm font-semibold">
                  {t(isPartner ? "Customer account" : "Partner area")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t(
                    isPartner
                      ? "Book vehicles and manage your trips."
                      : "List vehicles and manage rental requests.",
                  )}
                </p>
                <SheetClose asChild>
                  <Button variant="outline" asChild>
                    <Link href={href(alternateArea.path)}>
                      {t(alternateArea.label)}
                    </Link>
                  </Button>
                </SheetClose>
                {!isPartner && !customer && (
                  <SheetClose asChild>
                    <Link
                      href={href("partner-signup")}
                      className="text-center text-sm font-semibold text-primary hover:underline"
                    >
                      {t("Register as a partner")}
                    </Link>
                  </SheetClose>
                )}
              </section>
              {customer && (
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="mx-5 justify-start"
                    onClick={() => void signOut()}
                  >
                    <LogOut data-icon="inline-start" />
                    {t("Sign out of both areas")}
                  </Button>
                </SheetClose>
              )}
              <nav className="flex flex-col gap-2 p-5">
                {[
                  { name: "Home", path: "" },
                  { name: "Search Vehicles", path: `search/${searchCategory}` },
                  ...(!isPartner
                    ? categories.map((c) => ({
                        name: c.name,
                        path: `search/${c.id}`,
                      }))
                    : []),
                  ...(!customer && !isPartner
                    ? [{ name: "My Bookings", path: "account/bookings" }]
                    : []),
                  { name: "Help", path: "help" },
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
  if (accountAreaForPath(pathname) !== "customer") return null;
  return (
    <nav
      aria-label={t("Mobile navigation")}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {[
        [Search, "Search", "search/" + category],
        [Heart, "Saved", "account/saved"],
        [CalendarDays, "Bookings", "account/bookings"],
        [UserRound, "Customer account", "account/profile"],
      ].map(([Icon, label, url]) => {
        const I = Icon as typeof Search;
        const active = String(url).startsWith("search/")
          ? /^\/(th|en|zh)\/(search|vehicle|checkout)(\/|$)/.test(pathname)
          : url === "account/profile"
            ? /\/account\/(profile|reviews|payments|messages)(\/|$)/.test(
                pathname,
              )
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
