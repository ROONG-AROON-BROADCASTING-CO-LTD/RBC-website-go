"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRBC } from "@/components/rbc/provider";
import { isDemoCustomer, type DemoCustomer } from "@/lib/customer-auth";
import { logoutCustomer } from "@/lib/server/customer-actions";

export type AuthMode = "login" | "register";
const loginPromptKey = "rbc-go-login-prompt-seen-v1";
type AccountSnapshot = {
  id: string;
  display_name: string;
  email: string | null;
  auth_provider: string;
  traveler_name: string | null;
  traveler_email: string | null;
  traveler_phone: string | null;
};
type AccountCustomer = {
  kind: "account";
  id: string;
  name: string;
  email: string;
  phone: string;
  method: "email" | "google" | "account";
};
const CustomerAuthDialog = dynamic(() => import("./auth-dialog"));
const AuthContext = createContext<{
  customer: DemoCustomer | AccountCustomer | null;
  openAuth: (mode?: AuthMode, returnTo?: string) => void;
  signOut: () => Promise<void>;
} | null>(null);

export function CustomerAuthProvider({
  children,
  initialAccount,
  googleEnabled,
}: {
  children: ReactNode;
  initialAccount: AccountSnapshot | null;
  googleEnabled: boolean;
}) {
  const { state, setState, ready, t, go, href } = useRBC();
  const router = useRouter();
  const pathname = usePathname();
  const [serverAccount, setServerAccount] = useState(initialAccount);
  const loginPromptChecked = useRef(false);
  const [dialog, setDialog] = useState<{
    mode: AuthMode;
    returnTo?: string;
  } | null>(null);
  useEffect(() => setServerAccount(initialAccount), [initialAccount]);
  useEffect(() => {
    if (
      !ready ||
      serverAccount ||
      isDemoCustomer(state.customer) ||
      loginPromptChecked.current ||
      /^\/(th|en|zh)\/(email|partner|partner-login|partner-signup|apply|operations)(\/|$)/.test(
        pathname,
      )
    )
      return;
    loginPromptChecked.current = true;
    try {
      if (sessionStorage.getItem(loginPromptKey)) return;
      sessionStorage.setItem(loginPromptKey, "1");
    } catch {
      // The prompt still works when session storage is unavailable.
    }
    setDialog({ mode: "login" });
  }, [ready, serverAccount, state.customer, pathname]);
  useEffect(() => {
    if (!ready || !initialAccount) return;
    setState((current) => ({
      ...current,
      traveler: {
        name: initialAccount.traveler_name ?? "",
        email: initialAccount.traveler_email ?? "",
        phone: initialAccount.traveler_phone ?? "",
      },
    }));
  }, [ready, initialAccount, setState]);
  const customer: DemoCustomer | AccountCustomer | null = serverAccount
    ? {
        kind: "account",
        id: serverAccount.id,
        name: serverAccount.display_name,
        email: serverAccount.email ?? "",
        phone: "",
        method:
          serverAccount.auth_provider === "google"
            ? "google"
            : serverAccount.auth_provider === "email"
              ? "email"
              : "account",
      }
    : isDemoCustomer(state.customer)
      ? state.customer
      : null;
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
        signOut: async () => {
          loginPromptChecked.current = true;
          try {
            sessionStorage.setItem(loginPromptKey, "1");
          } catch {
            // Navigation still works when session storage is unavailable.
          }
          if (serverAccount) {
            try {
              await logoutCustomer();
              setServerAccount(null);
            } catch {
              toast.error(t("Please try again."));
              return;
            }
          }
          setState((current) => ({
            ...current,
            customer: null,
            traveler: { name: "", email: "", phone: "" },
          }));
          toast.success(t("You have signed out."));
          router.replace(href());
        },
      }}
    >
      {children}
      {dialog && (
        <CustomerAuthDialog
          initialMode={dialog.mode}
          onClose={() => setDialog(null)}
          onComplete={complete}
          googleEnabled={googleEnabled}
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
