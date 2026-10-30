"use client";

import { PageHeading } from "@/components/rbc/common";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { OperationsOverview } from "./overview";
import { OperationsActivity } from "./activity";
import { RecordsWorkspace } from "./records-workspace";

export default function OperationsWorkspace({ tab }: { tab: string }) {
  return (
    <WorkspaceShell role="operations" tab={tab}>
      <PageHeading
        eyebrow="RBC GO Operations"
        title={tab.charAt(0).toUpperCase() + tab.slice(1)}
        description="All marketplace records"
      />
      {tab === "overview" ? (
        <OperationsOverview />
      ) : tab === "activity" ? (
        <OperationsActivity />
      ) : (
        <RecordsWorkspace tab={tab} />
      )}
    </WorkspaceShell>
  );
}
