"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { initialState, type AppState, type Locale } from "@/lib/domain";
import { translate, money, formatDate } from "@/lib/i18n";

const STORAGE_KEY = "rbc-go-next-v1";
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
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const router = useRouter();
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (
        saved?.version === 1 &&
        Array.isArray(saved.data?.bookings) &&
        Array.isArray(saved.data?.saved)
      ) {
        setState({
          ...initialState,
          ...saved.data,
          search: { ...initialState.search, ...saved.data.search },
          traveler: { ...initialState.traveler, ...saved.data.traveler },
          partner: { ...initialState.partner, ...saved.data.partner },
        });
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: 1, data: state }),
        );
      } catch {
        setStorageError(true);
      }
  }, [state, ready]);
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
