"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useRBC } from "@/components/rbc/provider";
import { Panel, Blank } from "@/components/rbc/common";

export function OperationsActivity() {
  const { state, setState, t } = useRBC();
  const [note, setNote] = useState("");
  return (
    <Panel title="Activity history">
      <div className="mb-6 flex flex-col gap-3">
        {state.activity.length ? (
          state.activity.map((item, i) => (
            <p key={`${i}-${item}`} className="border-b pb-3 text-sm leading-7">
              {t(item)}
            </p>
          ))
        ) : (
          <Blank />
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          setState((s) => ({
            ...s,
            activity: [note.trim(), ...s.activity],
          }));
          setNote("");
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="internal-note">
              {t("Internal note")}
            </FieldLabel>
            <Textarea
              id="internal-note"
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <Button type="submit" className="self-start">
            <Plus data-icon="inline-start" />
            {t("Add note")}
          </Button>
        </FieldGroup>
      </form>
    </Panel>
  );
}
