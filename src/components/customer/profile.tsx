"use client";

import { useState } from "react";
import { UserRound, LogOut } from "lucide-react";
import { useCustomerAuth } from "./auth/provider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRBC } from "@/components/rbc/provider";
import { Panel } from "@/components/rbc/common";
import { TravelerFields, travelerErrors } from "@/components/rbc/booking";

export function CustomerProfile() {
  const { state, setState, t } = useRBC();
  const { customer, openAuth, signOut } = useCustomerAuth();
  const [invalid, setInvalid] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <Panel title="Customer account">
        {customer ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ocean-soft text-ocean">
                <UserRound className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{customer.name}</p>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {customer.method === "phone"
                    ? customer.phone
                    : customer.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Demo account")} · {t("Signed in with")}{" "}
                  {customer.method === "phone"
                    ? t("Phone number")
                    : customer.method === "google"
                      ? "Google"
                      : "Facebook"}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={signOut}>
              <LogOut data-icon="inline-start" />
              {t("Sign out")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t("Sign in to manage your account.")}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => openAuth("login")}>{t("Sign In")}</Button>
              <Button variant="outline" onClick={() => openAuth("register")}>
                {t("Register")}
              </Button>
            </div>
          </div>
        )}
      </Panel>
      <Panel title="Traveler information">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setInvalid(true);
            if (!Object.values(travelerErrors(state.traveler)).some(Boolean)) {
              if (customer)
                setState((current) => ({
                  ...current,
                  customer: { ...customer, ...current.traveler },
                }));
              toast.success(t("Saved locally"));
            }
          }}
        >
          <TravelerFields errors={invalid} />
          <Button type="submit" className="mt-6">
            {t("Save changes")}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
