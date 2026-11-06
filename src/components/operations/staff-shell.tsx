"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UsersRound,
  CarFront,
  WalletCards,
  ArrowUpRight,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { createTranslator } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { logoutStaff } from "@/lib/server/staff-actions";
import { cn } from "@/lib/utils";
export function StaffShell({
  children,
  locale,
  role,
  name,
}: {
  children: React.ReactNode;
  locale: string;
  role: string;
  name: string;
}) {
  const pathname = usePathname(),
    t = createTranslator(locale);
  const links = [
    { path: "overview", label: "Business overview", icon: LayoutDashboard },
    ...(role !== "support"
      ? [
          { path: "partners", label: "Partners", icon: UsersRound },
          { path: "listings", label: "Vehicle listings", icon: CarFront },
        ]
      : []),
    { path: "payments", label: "Finance and bookings", icon: WalletCards },
  ];
  return (
    <div className="business-theme staff-layout">
      <aside className="staff-sidebar">
        <Link
          href={`/${locale}/operations/overview`}
          className="staff-brand"
          aria-label="RBC GO TEAM"
        >
          RBC GO <span>TEAM</span>
        </Link>
        <nav aria-label={t("Staff navigation")} className="staff-navigation">
          {links.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              href={`/${locale}/operations/${path}`}
              aria-current={pathname.endsWith(`/${path}`) ? "page" : undefined}
              className={cn(
                "staff-nav-link",
                pathname.endsWith(`/${path}`) && "is-active",
              )}
            >
              <Icon aria-hidden="true" />
              {t(label)}
            </Link>
          ))}
        </nav>
        <div className="staff-sidebar-footer">
          <div className="flex items-center gap-3 px-3 py-3">
            <ShieldCheck className="size-5 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="text-xs text-muted-foreground">{t(role)}</p>
            </div>
          </div>
          <Link href={`/${locale}`} className="staff-nav-link">
            <ArrowUpRight aria-hidden="true" />
            {t("Back to website")}
          </Link>
          <form action={logoutStaff}>
            <input type="hidden" name="locale" value={locale} />
            <Button variant="ghost" type="submit">
              <LogOut data-icon="inline-start" />
              {t("Sign out")}
            </Button>
          </form>
        </div>
      </aside>
      <div className="staff-main" id="main">
        {children}
      </div>
    </div>
  );
}
