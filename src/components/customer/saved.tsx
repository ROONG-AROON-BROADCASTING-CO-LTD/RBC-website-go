"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { vehicles } from "@/lib/domain";
import { useRBC } from "@/components/rbc/provider";
import { Blank, VehicleCard } from "@/components/rbc/common";

export function CustomerSaved() {
  const { state, t, href } = useRBC();
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {state.saved.length ? (
        vehicles
          .filter((v) => state.saved.includes(v.id))
          .map((v) => <VehicleCard key={v.id} vehicle={v} />)
      ) : (
        <Blank
          action={
            <Button asChild>
              <Link href={href()}>{t("Start exploring")}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
