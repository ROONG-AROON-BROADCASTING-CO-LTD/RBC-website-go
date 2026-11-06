import { initialState, type AppState, type Traveler } from "./domain";

const storageKey = "rbc-go-preferences-v2";
const legacyStorageKey = "rbc-go-next-v1";
type Snapshot = { state: AppState; ready: boolean; storageError: boolean };

// Each provider owns a store. The server snapshot stays stable during hydration;
// browser storage is read by the external store, rather than by a state effect.
export function createBrowserState(initialTraveler?: Traveler) {
  const serverSnapshot: Snapshot = {
    state: {
      ...initialState,
      traveler: initialTraveler ?? initialState.traveler,
    },
    ready: false,
    storageError: false,
  };
  let snapshot = serverSnapshot;
  const listeners = new Set<() => void>();
  function read() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(storageKey) ||
          localStorage.getItem(legacyStorageKey) ||
          "null",
      );
      const data =
        [1, 2].includes(saved?.version) && saved.data
          ? {
              search: saved.data.search,
              currency:
                saved.data.currency === "USD"
                  ? ("USD" as const)
                  : ("THB" as const),
            }
          : { search: undefined, currency: "THB" as const };
      snapshot = {
        ready: true,
        storageError: false,
        state: {
          ...initialState,
          ...data,
          search: { ...initialState.search, ...data.search },
          traveler: initialTraveler ?? initialState.traveler,
        },
      };
      localStorage.setItem(storageKey, JSON.stringify({ version: 2, data }));
      localStorage.removeItem(legacyStorageKey);
    } catch {
      snapshot = { ...serverSnapshot, ready: true, storageError: true };
    }
  }
  function changed() {
    for (const listener of listeners) listener();
  }
  function onStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) {
      read();
      changed();
    }
  }
  return {
    getServerSnapshot: () => serverSnapshot,
    getSnapshot: () => {
      if (!snapshot.ready) read();
      return snapshot;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) window.removeEventListener("storage", onStorage);
      };
    },
    setState(update: AppState | ((current: AppState) => AppState)) {
      const next =
        typeof update === "function" ? update(snapshot.state) : update;
      let storageError = false;
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            version: 2,
            data: { search: next.search, currency: next.currency },
          }),
        );
      } catch {
        storageError = true;
      }
      snapshot = { state: next, ready: true, storageError };
      changed();
    },
  };
}
