"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Navbar, MobileNavbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";
import { useRBC } from "@/components/rbc/provider";
import { Notice } from "@/components/rbc/common";
import { cn } from "@/lib/utils";

export function SiteShell({ children }: { children: ReactNode }) {
  const { t, state, storageError } = useRBC();
  const pathname = usePathname();
  const isHome = /^\/(th|en|zh)\/?$/.test(pathname);
  return (
    <>
      <a
        href="#main"
        className="sr-only rounded bg-primary p-3 text-primary-foreground focus:not-sr-only focus:absolute focus:z-50"
      >
        {t("Skip to content")}
      </a>
      <Navbar />
      {storageError && (
        <div className="mx-auto max-w-7xl p-4">
          <Notice
            title="Local demo data is unavailable in this browser."
            error
          />
        </div>
      )}
      {state.currency === "USD" && (
        <p className="bg-muted px-4 py-2 text-center text-xs text-muted-foreground">
          {t("Approximate USD display at THB 35/USD. Billing is in THB.")}
        </p>
      )}
      <main id="main" className={cn("min-h-[65vh]", isHome && "-mt-20")}>
        {children}
      </main>
      <Footer />
      <MobileNavbar />
      <Toaster position="top-center" richColors />
    </>
  );
}
