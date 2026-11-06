"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronDown,
  LogOut,
  UserRound,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCustomerAuth } from "@/components/customer/auth/provider";
import { useRBC } from "@/components/rbc/provider";
import { cn } from "@/lib/utils";
import { accountPrimaryLinks, partnerAccountLinks } from "./account-navigation";

export function AccountMenu({
  glass,
  area = "customer",
}: {
  glass: boolean;
  area?: "customer" | "partner";
}) {
  const { customer, signOut } = useCustomerAuth();
  const { t, href } = useRBC();
  if (!customer) return null;
  const partner = area === "partner";
  const label = partner ? "Partner account" : "Customer account";
  const AccountIcon = partner ? BriefcaseBusiness : UserRound;
  const links = partner
    ? partnerAccountLinks
    : accountPrimaryLinks.map(({ id, ...link }) => ({
        ...link,
        path: `account/${id}`,
      }));

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          aria-label={t(label)}
          className={cn(
            "hidden min-w-32 gap-2 rounded-xl font-semibold md:inline-flex",
            glass
              ? "bg-navy text-white hover:bg-navy/90"
              : "bg-white text-navy hover:bg-white/90",
          )}
        >
          <AccountIcon data-icon="inline-start" />
          {t(label)}
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-72 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {customer.name.trim().charAt(0).toLocaleUpperCase() || (
                <UserRound className="size-5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{customer.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {customer.email ||
                  (customer.method === "phone"
                    ? customer.phone
                    : customer.method === "google"
                      ? "Google"
                      : t("Account"))}
              </p>
            </div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Label className="px-3 py-2 text-xs font-semibold text-muted-foreground">
            {t(label)}
          </DropdownMenu.Label>
          <DropdownMenu.Group>
            {links.map(({ path, label, icon: Icon }) => (
              <DropdownMenu.Item key={path} asChild>
                <Link
                  href={href(path)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:bg-accent hover:bg-accent"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  {t(label)}
                </Link>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Group>
          <Separator className="my-2" />
          <DropdownMenu.Group>
            <DropdownMenu.Item
              onSelect={() => void signOut()}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:bg-accent hover:bg-accent"
            >
              <LogOut className="size-4 text-muted-foreground" />
              {t("Sign out of both areas")}
            </DropdownMenu.Item>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
