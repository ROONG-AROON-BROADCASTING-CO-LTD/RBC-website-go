"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useRBC } from "@/components/rbc/provider";
import { Panel, Notice } from "@/components/rbc/common";

export function CustomerMessages() {
  const { state, setState, t } = useRBC();
  const [message, setMessage] = useState("");
  return (
    <Panel title="Booking support" description="Local demo · No real payments">
      <div className="mb-7 flex flex-col gap-4">
        {state.messages.length ? (
          state.messages.map((m) => (
            <div
              key={m.id}
              className="ml-auto max-w-md rounded-2xl bg-secondary p-4"
            >
              <p className="whitespace-pre-wrap text-sm leading-7">{m.text}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(m.at).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <Notice title="No records yet">
            Your activity will appear here.
          </Notice>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!message.trim()) return;
          setState((s) => ({
            ...s,
            messages: [
              ...s.messages,
              {
                id: crypto.randomUUID(),
                text: message.trim(),
                at: new Date().toISOString(),
              },
            ],
          }));
          setMessage("");
          toast.success(t("Message sent locally"));
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="support-message">{t("Message")}</FieldLabel>
            <Textarea
              id="support-message"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
          <Button type="submit" className="self-start">
            <MessageSquare data-icon="inline-start" />
            {t("Send message")}
          </Button>
        </FieldGroup>
      </form>
    </Panel>
  );
}
