"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { accountNav, partnerNav, operationsNav } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useRBC } from "@/components/rbc/provider";

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
  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-5 px-4 py-5 md:grid-cols-[220px_minmax(0,1fr)] md:px-6 md:py-6">
      <aside className="min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t(label)}</p>
            <p className="text-xs text-muted-foreground">
              {t("Demo workspace")}
            </p>
          </div>
        </div>
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
        <p className="mt-5 hidden text-xs leading-6 text-muted-foreground md:block">
          {t(
            role === "operations"
              ? "All marketplace records"
              : role === "partner"
                ? "Own listings only"
                : "Storage is local to this browser.",
          )}
        </p>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
