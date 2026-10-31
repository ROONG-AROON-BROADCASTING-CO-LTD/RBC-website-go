import test from "node:test";
import assert from "node:assert/strict";
import {
  addBooking,
  initialState,
  initialSearch,
  pricing,
  quoteCanPay,
  validateDates,
  vehicleById,
  validRoute,
  type AppState,
} from "../src/lib/domain";
const car = vehicleById("mercedes")!;
const yacht = { ...vehicleById("azimut")!, mode: "quote" };
const fresh = () => structuredClone(initialState);
const quoteState = (availability = false): AppState => ({
  ...fresh(),
  quote: {
    id: "Q-1",
    vehicleId: "azimut",
    status: "Awaiting Payment",
    requirements: "Andaman day cruise",
    expiresAt: 2000,
    availability,
    search: { ...initialSearch },
    traveler: { name: "Test", email: "test@example.com", phone: "0810000000" },
    rental: 50000,
  },
});

test("daily rental rounds a partial day up and excludes security deposit", () => {
  const p = pricing(car, { ...initialSearch, returnTime: "10:00" });
  assert.deepEqual(p, {
    days: 2,
    rental: 6400,
    extras: 0,
    fee: 320,
    tax: 470,
    total: 7190,
  });
  assert.equal(pricing(car, initialSearch).total, 3595);
});
test("dates reject reversed and invalid ranges", () => {
  assert.equal(
    validateDates({ ...initialSearch, returnDate: "2026-11-14" }, "cars"),
    false,
  );
  assert.equal(validateDates({ ...initialSearch, date: "" }, "boats"), false);
});
test("instant payment creates a paid confirmed booking", () => {
  const next = addBooking(fresh(), car, "payment-1", 1000);
  assert.equal(next.bookings.length, 1);
  assert.equal(next.bookings[0].payment, "Paid");
  assert.equal(next.bookings[0].status, "Confirmed");
});
test("repeat payment callback cannot duplicate a booking", () => {
  const once = addBooking(fresh(), car, "payment-1", 1000);
  assert.strictEqual(addBooking(once, car, "payment-1", 1001), once);
});
test("expired or unaccepted quotation cannot be paid", () => {
  const state = quoteState();
  assert.equal(quoteCanPay(state.quote, "azimut", 2000), false);
  assert.equal(addBooking(state, yacht, "p", 2000).bookings.length, 0);
  state.quote!.status = "Quote Ready";
  assert.equal(addBooking(state, yacht, "p", 1000).bookings.length, 0);
});
test("paid quotation remains pending until availability is secured", () => {
  const result = addBooking(quoteState(false), yacht, "p", 1000);
  assert.equal(result.bookings[0].status, "Awaiting confirmation");
  assert.equal(result.bookings[0].payment, "Paid");
  assert.equal(result.bookings[0].total, 56175);
});
test("secured quotation becomes confirmed", () => {
  assert.equal(
    addBooking(quoteState(true), yacht, "p", 1000).bookings[0].status,
    "Confirmed",
  );
});
test("same quote cannot be charged through a second checkout token", () => {
  const once = addBooking(quoteState(), yacht, "p1", 1000);
  assert.strictEqual(addBooking(once, yacht, "p2", 1100), once);
});
test("blocked dates and fleet maintenance prevent booking", () => {
  const blocked = fresh();
  blocked.search.date = "2026-11-18";
  blocked.search.returnDate = "2026-11-19";
  assert.equal(addBooking(blocked, car, "p", 1000).bookings.length, 0);
  const maintenance = fresh();
  maintenance.fleet = "Maintenance";
  assert.equal(addBooking(maintenance, car, "p", 1000).bookings.length, 0);
});
test("booking snapshots are preserved when the next search changes", () => {
  const booked = addBooking(fresh(), car, "p", 1000);
  booked.search.date = "2026-12-01";
  assert.equal(booked.bookings[0].search.date, "2026-11-15");
});
test("unknown routes do not silently render the wrong vehicle", () => {
  assert.equal(validRoute(["vehicle", "missing"]), false);
  assert.equal(validRoute(["wizard", "8"]), false);
  assert.equal(validRoute(["account", "unknown"]), false);
  assert.equal(validRoute(["account", "reviews"]), true);
  assert.equal(validRoute(["search", "cars"]), true);
});

test("package prices include selected extras and tax without duplicate charges", () => {
  const search = {
    ...initialSearch,
    packages: [
      "additional-driver",
      "child-seat",
      "child-seat",
      "unknown",
      "catering",
    ],
  };
  assert.equal(pricing(car, search).extras, 800);
  assert.equal(pricing(car, search).total, 4451);
});
test("booked packages are copied and cannot be changed by a later search", () => {
  const state = fresh();
  state.search.packages = ["child-seat"];
  const next = addBooking(state, car, "package-test", 1000);
  state.search.packages.push("additional-driver");
  assert.deepEqual(next.bookings[0].search.packages, ["child-seat"]);
  assert.equal(next.bookings[0].total, 3916);
});
test("all public inventory can be booked instantly at a published price", () => {
  for (const id of [
    "mercedes",
    "azimut",
    "citation",
    "vespa",
    "andaman",
    "chauffeur",
    "vespa-samui",
  ]) {
    const vehicle = vehicleById(id)!;
    assert.equal(vehicle.mode, "instant");
    assert.ok(vehicle.price > 0);
  }
});
