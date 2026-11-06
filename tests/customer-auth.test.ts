import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCustomerPhone } from "../src/lib/customer-auth";

test("Thai mobile numbers normalize consistently with or without the trunk prefix", () => {
  assert.equal(normalizeCustomerPhone("+66", "081 234 5678"), "+66812345678");
  assert.equal(
    normalizeCustomerPhone("+66", "+66 81-234-5678"),
    "+66812345678",
  );
  assert.equal(normalizeCustomerPhone("+66", "812345678"), "+66812345678");
});
test("phone entry rejects invalid numbers and mismatched country codes", () => {
  assert.equal(normalizeCustomerPhone("+66", "02 123 4567"), null);
  assert.equal(normalizeCustomerPhone("+66", "0812"), null);
  assert.equal(normalizeCustomerPhone("+66", "081hello2345678"), null);
  assert.equal(normalizeCustomerPhone("+66", "+1 202 555 0100"), null);
  assert.equal(normalizeCustomerPhone("+65", "8123 4567"), "+6581234567");
});
