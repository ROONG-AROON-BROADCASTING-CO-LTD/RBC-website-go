"use client";

import { PageHeading } from "@/components/rbc/common";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { useCustomerAuth } from "./auth/provider";
import { CustomerBookings } from "./bookings";
import { CustomerSaved } from "./saved";
import { CustomerPayments } from "./payments";
import { CustomerProfile } from "./profile";
import { CustomerMessages } from "./messages";
import { CustomerReviews } from "./reviews";
import {
  accountPrimaryLinks,
  accountSecondaryLinks,
} from "./account-navigation";

export default function CustomerAccount({ tab }: { tab: string }) {
  const { customer } = useCustomerAuth();
  const item = [...accountPrimaryLinks, ...accountSecondaryLinks].find(
    (entry) => entry.id === tab,
  );
  return (
    <WorkspaceShell role="account" tab={tab}>
      <PageHeading
        eyebrow="Customer account"
        title={item?.label || "Customer account"}
        description={
          tab === "profile"
            ? "Manage your account and traveler information."
            : tab === "bookings"
              ? "Find and manage your booking activity."
              : tab === "reviews"
                ? "See reviews from your completed trips."
                : customer?.kind === "account"
                  ? "Bookings are currently saved in this browser."
                  : "Storage is local to this browser."
        }
      />
      {tab === "bookings" && <CustomerBookings />}
      {tab === "saved" && <CustomerSaved />}
      {tab === "payments" && <CustomerPayments />}
      {tab === "profile" && <CustomerProfile />}
      {tab === "messages" && <CustomerMessages />}
      {tab === "reviews" && <CustomerReviews />}
    </WorkspaceShell>
  );
}
