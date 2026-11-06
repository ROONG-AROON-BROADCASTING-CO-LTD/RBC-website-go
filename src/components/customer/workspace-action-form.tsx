"use client";
import { useActionState, type ReactNode } from "react";
import { workspaceAction } from "@/lib/server/workspace-actions";
import { Button } from "@/components/ui/button";
import { useRBC } from "@/components/rbc/provider";

export function WorkspaceActionForm({
  operation,
  values,
  label,
  children,
}: {
  operation: string;
  values?: Record<string, string>;
  label: string;
  children?: ReactNode;
}) {
  const { locale, t } = useRBC();
  const [state, action, pending] = useActionState(workspaceAction, {
    error: "",
    message: "",
  });
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="operation" value={operation} />
      {Object.entries(values ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(state.error)}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-muted-foreground">
          {t(state.message)}
        </p>
      )}
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="self-start"
      >
        {t(pending ? "Saving..." : label)}
      </Button>
    </form>
  );
}
