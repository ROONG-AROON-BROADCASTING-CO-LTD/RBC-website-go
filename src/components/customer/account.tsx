"use client";

import { PageHeading } from "@/components/rbc/common";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { CustomerProfile } from "./profile";

export default function CustomerAccount({ tab }: { tab: string }) {
  return (
    <WorkspaceShell role="account" tab={tab}>
      <PageHeading
        eyebrow="Customer account"
        title="Customer details"
        description="Manage your account and traveler information."
      />
      <CustomerProfile />
    </WorkspaceShell>
  );
}
