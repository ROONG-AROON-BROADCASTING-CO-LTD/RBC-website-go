"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { type AppState, type Locale, type Traveler } from "@/lib/domain";
import { createBrowserState } from "@/lib/browser-state";
import { translate, money, formatDate } from "@/lib/i18n";

type ContextValue = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  ready: boolean;
  storageError: boolean;
  locale: Locale;
  t: (text: string) => string;
  amount: (n: number) => string;
  date: (d: string) => string;
  href: (path?: string) => string;
  go: (path: string) => void;
};
const Context = createContext<ContextValue | null>(null);
export function RBCProvider({
  locale,
  children,
  initialTraveler,
}: {
  locale: Locale;
  children: ReactNode;
  initialTraveler?: Traveler;
}) {
  const [store] = useState(() => createBrowserState(initialTraveler));
  const { state, ready, storageError } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const setState = store.setState;
  const router = useRouter();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const href = useCallback(
    (path = "") => `/${locale}${path ? "/" + path.replace(/^\//, "") : ""}`,
    [locale],
  );
  const value: ContextValue = {
    state,
    setState,
    ready,
    storageError,
    locale,
    t: (s) => translate(locale, s),
    amount: (n) => money(n, state.currency),
    date: (d) => formatDate(locale, d),
    href,
    go: (path) => router.push(href(path)),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useRBC() {
  const context = useContext(Context);
  if (!context) throw new Error("RBCProvider is required");
  return context;
}
