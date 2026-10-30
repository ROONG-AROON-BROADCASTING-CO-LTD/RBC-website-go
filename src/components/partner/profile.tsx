"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useRBC } from "@/components/rbc/provider";
import { Panel, TextField } from "@/components/rbc/common";

export function PartnerProfile() {
  const { state, setState, t } = useRBC();
  const p = state.partner;
  return (
    <Panel title="Business profile">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.success(t("Saved locally"));
        }}
      >
        <FieldGroup>
          <TextField
            label="Business name"
            required
            value={p.business}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                partner: { ...s.partner, business: e.target.value },
              }))
            }
          />
          <TextField
            label="Email"
            type="email"
            required
            value={p.email}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                partner: { ...s.partner, email: e.target.value },
              }))
            }
          />
          <Button type="submit" className="self-start">
            {t("Save changes")}
          </Button>
        </FieldGroup>
      </form>
    </Panel>
  );
}
