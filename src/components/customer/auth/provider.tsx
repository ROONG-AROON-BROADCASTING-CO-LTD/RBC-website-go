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
import { logoutCustomer } from "@/lib/server/customer-actions";

export type AuthMode = "login" | "register";
const loginPromptKey = "rbc-go-login-prompt-seen-v1";
type AccountSnapshot = {
  id: string;
  display_name: string;
  email: string | null;
  auth_provider: string;
  phone_e164: string | null;
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
  method: "email" | "google" | "phone" | "account";
};
const CustomerAuthDialog = dynamic(() => import("./auth-dialog"));
const AuthContext = createContext<{
  customer: AccountCustomer | null;
  openAuth: (mode?: AuthMode, returnTo?: string) => void;
  signOut: () => Promise<void>;
} | null>(null);

export function CustomerAuthProvider({
  children,
  initialAccount,
  googleEnabled,
  emailOtpEnabled,
}: {
  children: ReactNode;
  initialAccount: AccountSnapshot | null;
  googleEnabled: boolean;
  emailOtpEnabled: boolean;
}) {
  const { setState, ready, t, go, href } = useRBC();
  const router = useRouter();
  const pathname = usePathname();
  const serverAccount = initialAccount;
  const loginPromptChecked = useRef(false);
  const [dialog, setDialog] = useState<{
    mode: AuthMode;
    returnTo?: string;
  } | null>(null);
  useEffect(() => {
    if (
      !ready ||
      serverAccount ||
      loginPromptChecked.current ||
      /^\/(th|en|zh)\/(email|account-access|partner|partner-login|partner-signup|apply|operations)(\/|$)/.test(
        pathname,
      )
    )
      return;
    // Delay the invitation until the first screen has settled. Cancel it when
    // navigation or authentication changes before the invitation appears.
    const timer = window.setTimeout(() => {
      loginPromptChecked.current = true;
      try {
        if (sessionStorage.getItem(loginPromptKey)) return;
        sessionStorage.setItem(loginPromptKey, "1");
      } catch {
        // The prompt still works when session storage is unavailable.
      }
      setDialog({ mode: "login" });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [ready, serverAccount, pathname]);
  const customer: AccountCustomer | null = serverAccount
    ? {
        kind: "account",
        id: serverAccount.id,
        name: serverAccount.display_name,
        email: serverAccount.email ?? "",
        phone: serverAccount.phone_e164 ?? "",
        method:
          serverAccount.auth_provider === "google"
            ? "google"
            : serverAccount.auth_provider === "email"
              ? "email"
              : serverAccount.auth_provider === "phone"
                ? "phone"
                : "account",
      }
    : null;
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
            } catch {
              toast.error(t("Please try again."));
              return;
            }
          }
          setState((current) => ({
            ...current,
            traveler: { name: "", email: "", phone: "" },
          }));
          toast.success(t("You have signed out."));
          router.replace(href());
          router.refresh();
        },
      }}
    >
      {children}
      {dialog && (
        <CustomerAuthDialog
          initialMode={dialog.mode}
          onClose={() => setDialog(null)}
          googleEnabled={googleEnabled}
          emailOtpEnabled={emailOtpEnabled}
          onEmailComplete={() => {
            const returnTo = dialog?.returnTo;
            setDialog(null);
            if (returnTo) go(returnTo);
            router.refresh();
          }}
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
