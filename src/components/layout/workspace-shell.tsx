"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, UserRound } from "lucide-react";
import { accountNav, partnerNav, operationsNav } from "@/lib/domain";
import { Separator } from "@/components/ui/separator";
import {
  accountPrimaryLinks,
  accountSecondaryLinks,
} from "@/components/customer/account-navigation";
import { cn } from "@/lib/utils";
import { useRBC } from "@/components/rbc/provider";
import { useCustomerAuth } from "@/components/customer/auth/provider";

export function WorkspaceShell({
  role,
  tab,
  children,
}: {
  role: "account" | "partner" | "operations";
  tab: string;
  children: ReactNode;
}) {
  const { t, href } = useRBC();
  const { customer } = useCustomerAuth();
  const signedInAccount = role === "account" && customer?.kind === "account";
  const tabs =
    role === "partner"
      ? partnerNav
      : role === "operations"
        ? operationsNav
        : accountNav;
  const label =
    role === "partner"
      ? "Partner portal"
      : role === "operations"
        ? "Operations dashboard"
        : "Customer account";
  const accountLink = ({
    id,
    label,
    icon: Icon,
  }:
    | (typeof accountPrimaryLinks)[number]
    | (typeof accountSecondaryLinks)[number]) => (
    <Link
      key={id}
      href={href(`account/${id}`)}
      aria-current={id === tab ? "page" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        tab === id
          ? "bg-primary/10 text-primary"
          : "text-foreground/80 hover:bg-accent",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {t(label)}
    </Link>
  );
  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-5 px-4 py-5 md:grid-cols-[240px_minmax(0,1fr)] md:px-6 md:py-8">
      <aside
        className={cn(
          "min-w-0",
          role === "account" &&
            "rounded-2xl border bg-card p-3 shadow-sm md:self-start md:p-4",
        )}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            {role === "account" ? (
              <UserRound className="size-5" />
            ) : (
              <ShieldCheck className="size-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">{t(label)}</p>
            <p className="text-xs text-muted-foreground">
              {t(signedInAccount ? "Server account" : "Demo workspace")}
            </p>
          </div>
        </div>
        {role === "account" ? (
          <nav
            aria-label={t("My account")}
            className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible"
          >
            {accountPrimaryLinks.map(accountLink)}
            <Separator className="mx-2 hidden w-auto md:my-2 md:block" />
            {accountSecondaryLinks.map(accountLink)}
          </nav>
        ) : (
          <nav className="flex gap-2 overflow-x-auto pb-3 md:flex-col md:overflow-visible">
            {tabs.map((item) => (
              <Link
                key={item}
                href={href(`${role}/${item}`)}
                aria-current={item === tab ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  tab === item
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                {t(item.charAt(0).toUpperCase() + item.slice(1))}
              </Link>
            ))}
          </nav>
        )}
        <p className="mt-5 hidden text-xs leading-6 text-muted-foreground md:block">
          {t(
            role === "operations"
              ? "All marketplace records"
              : role === "partner"
                ? "Own listings only"
                : signedInAccount
                  ? "Your account activity is saved securely and available across devices."
                  : "Storage is local to this browser.",
          )}
        </p>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
