"use client";

import { PageHeading } from "@/components/rbc/common";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { CustomerBookings } from "./bookings";
import { CustomerSaved } from "./saved";
import { CustomerPayments } from "./payments";
import { CustomerProfile } from "./profile";
import { CustomerMessages } from "./messages";

export default function CustomerAccount({ tab }: { tab: string }) {
  return (
    <WorkspaceShell role="account" tab={tab}>
      <PageHeading
        eyebrow="Customer account"
        title={tab.charAt(0).toUpperCase() + tab.slice(1)}
        description="Storage is local to this browser."
      />
      {tab === "bookings" && <CustomerBookings />}
      {tab === "saved" && <CustomerSaved />}
      {tab === "payments" && <CustomerPayments />}
      {tab === "profile" && <CustomerProfile />}
      {tab === "messages" && <CustomerMessages />}
    </WorkspaceShell>
  );
}
