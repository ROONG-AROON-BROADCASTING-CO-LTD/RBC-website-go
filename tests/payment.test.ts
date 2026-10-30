import test from "node:test";
import assert from "node:assert/strict";
import { testCardErrors } from "../src/lib/booking-packages";
const now = new Date("2026-10-29T12:00:00Z");
const valid = {
  name: "Demo Traveler",
  number: "4242 4242 4242 4242",
  expiry: "12/35",
  cvc: "123",
};
test("gateway accepts only documented demo cards with valid test details", () => {
  assert.equal(Object.values(testCardErrors(valid, now)).some(Boolean), false);
  assert.equal(
    Object.values(
      testCardErrors({ ...valid, number: "4000 0000 0000 0002" }, now),
    ).some(Boolean),
    false,
  );
  assert.ok(
    testCardErrors({ ...valid, number: "4111 1111 1111 1111" }, now).number,
  );
});
test("gateway rejects missing names, expired cards and invalid security codes", () => {
  const errors = testCardErrors(
    { ...valid, name: " ", expiry: "01/20", cvc: "1" },
    now,
  );
  assert.ok(errors.name);
  assert.ok(errors.expiry);
  assert.ok(errors.cvc);
});
