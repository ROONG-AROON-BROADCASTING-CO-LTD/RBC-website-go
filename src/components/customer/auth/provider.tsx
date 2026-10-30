"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useRBC } from "@/components/rbc/provider";
import { isDemoCustomer, type DemoCustomer } from "@/lib/customer-auth";

export type AuthMode = "login" | "register";
const CustomerAuthDialog = dynamic(() => import("./auth-dialog"));
const AuthContext = createContext<{
  customer: DemoCustomer | null;
  openAuth: (mode?: AuthMode, returnTo?: string) => void;
  signOut: () => void;
} | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const { state, setState, t, go } = useRBC();
  const [dialog, setDialog] = useState<{
    mode: AuthMode;
    returnTo?: string;
  } | null>(null);
  const customer = isDemoCustomer(state.customer) ? state.customer : null;
  const complete = (profile: Omit<DemoCustomer, "kind" | "id">) => {
    const next: DemoCustomer = {
      ...profile,
      kind: "demo",
      id: crypto.randomUUID(),
    };
    setState((current) => ({
      ...current,
      customer: next,
      traveler: {
        ...current.traveler,
        name: profile.name || current.traveler.name,
        email: profile.email || current.traveler.email,
        phone: profile.phone || current.traveler.phone,
      },
    }));
    const returnTo = dialog?.returnTo;
    setDialog(null);
    toast.success(t("Signed in to your demo account."));
    if (returnTo) go(returnTo);
  };
  return (
    <AuthContext.Provider
      value={{
        customer,
        openAuth: (mode = "login", returnTo) => setDialog({ mode, returnTo }),
        signOut: () => {
          setState((current) => ({
            ...current,
            customer: null,
            traveler: { name: "", email: "", phone: "" },
          }));
          toast.success(t("You have signed out."));
        },
      }}
    >
      {children}
      {dialog && (
        <CustomerAuthDialog
          initialMode={dialog.mode}
          onClose={() => setDialog(null)}
          onComplete={complete}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("CustomerAuthProvider is required");
  return context;
}
