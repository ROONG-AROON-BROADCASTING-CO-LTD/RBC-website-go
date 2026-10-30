"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useRBC } from "@/components/rbc/provider";
import {
  PageHeading,
  Panel,
  TextField,
  Notice,
  Status,
} from "@/components/rbc/common";
import { FilePicker } from "./file-picker";

export default function PartnerApplication() {
  const { state, setState, t, go } = useRBC();
  const [error, setError] = useState(false);
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-5 md:py-8">
      <PageHeading
        eyebrow="RBC GO Partners"
        title="Turn your vehicles into opportunities."
        description="Connect with travelers. Grow your business."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Panel title="Partner application">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !state.partner.business.trim() ||
                !/^\S+@\S+\.\S+$/.test(state.partner.email) ||
                !state.partner.documents.length
              ) {
                setError(true);
                return;
              }
              setState((s) => ({
                ...s,
                partner: { ...s.partner, status: "Pending approval" },
                activity: ["Application submitted", ...s.activity],
              }));
              toast.success(t("Application submitted"));
              go("partner/overview");
            }}
          >
            <FieldGroup>
              <TextField
                label="Business name"
                required
                value={state.partner.business}
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
                value={state.partner.email}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    partner: { ...s.partner, email: e.target.value },
                  }))
                }
              />
              <FilePicker
                id="documents"
                label="Supporting documents"
                kind="documents"
                files={state.partner.documents}
                onFilesChange={(names) =>
                  setState((s) => ({
                    ...s,
                    partner: {
                      ...s.partner,
                      documents: names,
                    },
                  }))
                }
              />
              {error && (
                <Notice error title="Please complete the required fields." />
              )}
              <Button type="submit" size="lg">
                {t("Submit application")}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </FieldGroup>
          </form>
        </Panel>
        <div className="flex flex-col gap-5">
          <Notice title="Next step">
            Our operations team will review your application and documents.
          </Notice>
          <Panel title="Application status">
            <Status value={state.partner.status} />
            {state.partner.feedback && (
              <p className="mt-4 text-sm leading-7">{state.partner.feedback}</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
