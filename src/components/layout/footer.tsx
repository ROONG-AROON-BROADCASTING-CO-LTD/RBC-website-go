"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { categories } from "@/lib/domain";
import { useRBC } from "@/components/rbc/provider";

export function Footer() {
  const { t, href } = useRBC();
  const pathname = usePathname();
  const workspace = pathname.split("/")[2];
  const internal = workspace === "partner" || workspace === "operations";
  return (
    <footer className="bg-navy pb-24 pt-8 text-white md:pb-8">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-5 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Link
            href={href()}
            className="flex items-center gap-3 text-3xl font-bold"
          >
            RBC GO
            <ArrowUpRight className="size-7" />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">
            {t(
              "Discover and book cars, motorcycles, boats, and private jets from trusted service partners.",
            )}
          </p>
        </div>
        {[
          {
            title: "Explore",
            links: categories.map((c) => [c.name, `search/${c.id}`]),
          },
          {
            title: "Support",
            links: [
              ["Help", "help"],
              ["My Bookings", "account/bookings"],
              ["Cancellation terms", "help"],
              ["Privacy policy", "help"],
            ],
          },
          {
            title: "Partners",
            links: [
              ["Become a Partner", "apply"],
              ["Partner portal", "partner/overview"],
            ],
          },
        ].map((group) => (
          <div key={group.title}>
            <p className="mb-3 font-semibold">{t(group.title)}</p>
            <div className="flex flex-col gap-2.5 text-sm text-white/65">
              {group.links.map(([name, url]) => (
                <Link key={name} className="hover:text-white" href={href(url)}>
                  {t(name)}
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="border-t border-white/15 pt-6 text-xs text-white/50 md:col-span-4">
          © 2026 RBC GO · {t("Local demo · No real payments")} ·{" "}
          {t("Sample inventory and reviews")}
          {internal && (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <span>{t("Staff tools")}</span>
              <Link className="underline" href={href("operations/overview")}>
                {t("Operations")}
              </Link>
              <Link className="underline" href={href("guide")}>
                {t("Design guide")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
