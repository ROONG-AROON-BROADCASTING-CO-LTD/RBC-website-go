"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRBC } from "@/components/rbc/provider";
import { PageHeading } from "@/components/rbc/common";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PartnerOverview } from "./overview";
import { PartnerListings } from "./listings";
import { PartnerRequests } from "./requests";
import { PartnerBookings } from "./bookings";
import { PartnerEarnings } from "./earnings";
import { PartnerProfile } from "./profile";
import { AvailabilityCalendar } from "./availability-calendar";

export default function PartnerPortal({ tab }: { tab: string }) {
  const { t, href } = useRBC();
  return (
    <WorkspaceShell role="partner" tab={tab}>
      <PageHeading
        eyebrow="Partner portal"
        title={tab.charAt(0).toUpperCase() + tab.slice(1)}
        description="Own listings only"
        action={
          <Button asChild>
            <Link href={href("wizard/0")}>
              <Plus data-icon="inline-start" />
              {t("Create listing")}
            </Link>
          </Button>
        }
      />
      {tab === "overview" && <PartnerOverview />}
      {tab === "listings" && <PartnerListings />}
      {tab === "availability" && <AvailabilityCalendar />}
      {tab === "requests" && <PartnerRequests />}
      {tab === "bookings" && <PartnerBookings />}
      {tab === "earnings" && <PartnerEarnings />}
      {tab === "profile" && <PartnerProfile />}
    </WorkspaceShell>
  );
}
