"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRBC } from "@/components/rbc/provider";
import { Panel, Notice, Status, Blank } from "@/components/rbc/common";

export function PartnerListings() {
  const { state, t, href, amount } = useRBC();
  const p = state.partner;
  return p.listing ? (
    <Panel title={p.listing.name}>
      <div className="flex flex-col items-start gap-5">
        <Status value={p.listing.status} />
        <p>
          {t(p.listing.location)} · {amount(p.listing.price)}
        </p>
        {p.listing.feedback && (
          <Notice title="Review feedback">{p.listing.feedback}</Notice>
        )}
        <Button variant="outline" asChild>
          <Link href={href("wizard/0")}>{t("Edit listing")}</Link>
        </Button>
      </div>
    </Panel>
  ) : (
    <Blank
      action={
        <Button asChild>
          <Link href={href("wizard/0")}>{t("Create listing")}</Link>
        </Button>
      }
    />
  );
}
