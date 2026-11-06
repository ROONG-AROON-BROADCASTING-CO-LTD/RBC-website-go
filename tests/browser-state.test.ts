import assert from "node:assert/strict";
import test from "node:test";
import { createBrowserState } from "../src/lib/browser-state";
import { initialState, vehicles } from "../src/lib/domain";

function withStorage(
  values: Record<string, string>,
  run: (storage: Map<string, string>) => void,
) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = new Map(Object.entries(values));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  try {
    run(storage);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

test("old browser demo records are removed while server account details stay authoritative", () => {
  const traveler = {
    name: "Current account",
    email: "current@example.test",
    phone: "",
  };
  const legacy = {
    ...initialState,
    customer: { kind: "demo", name: "Old customer" },
    traveler: {
      name: "Old customer",
      email: "old@example.test",
      phone: "0810000000",
    },
    bookings: [{ id: "OLD-DEMO" }],
    saved: ["azimut"],
    messages: [{ text: "Demo message" }],
    partner: { business: "Demo company", blocked: ["2026-11-18"] },
    currency: "USD",
  };
  withStorage(
    { "rbc-go-next-v1": JSON.stringify({ version: 1, data: legacy }) },
    (storage) => {
      const state = createBrowserState(traveler).getSnapshot().state;
      assert.deepEqual(state.traveler, traveler);
      assert.deepEqual(state.bookings, []);
      assert.deepEqual(state.saved, []);
      assert.deepEqual(state.messages, []);
      assert.equal(state.partner.business, "");
      assert.deepEqual(state.partner.blocked, []);
      assert.ok(!("customer" in state));
      assert.equal(state.currency, "USD");
      assert.equal(storage.has("rbc-go-next-v1"), false);
      assert.deepEqual(
        Object.keys(
          JSON.parse(storage.get("rbc-go-preferences-v2")!).data,
        ).sort(),
        ["currency", "search"],
      );
    },
  );
});

test("fresh installations have no inventory or sample dates and persist only preferences", () => {
  withStorage({}, (storage) => {
    const store = createBrowserState();
    assert.deepEqual(vehicles, []);
    assert.equal(store.getSnapshot().state.search.date, "");
    assert.equal(store.getSnapshot().state.search.returnDate, "");
    store.setState((current) => ({
      ...current,
      currency: "USD",
      traveler: {
        name: "Private account",
        email: "private@example.test",
        phone: "0810000000",
      },
    }));
    const saved = storage.get("rbc-go-preferences-v2")!;
    assert.doesNotMatch(
      saved,
      /Private account|private@example|0810000000|bookings|partner/,
    );
    const reloaded = createBrowserState().getSnapshot().state;
    assert.equal(reloaded.currency, "USD");
    assert.deepEqual(reloaded.traveler, initialState.traveler);
    assert.deepEqual(reloaded.bookings, []);
  });
});

test("corrupt browser data falls back to empty state without restoring demo records", () => {
  withStorage({ "rbc-go-next-v1": "invalid json" }, () => {
    const snapshot = createBrowserState().getSnapshot();
    assert.equal(snapshot.ready, true);
    assert.equal(snapshot.storageError, true);
    assert.deepEqual(snapshot.state.bookings, []);
    assert.deepEqual(snapshot.state.traveler, initialState.traveler);
  });
});
