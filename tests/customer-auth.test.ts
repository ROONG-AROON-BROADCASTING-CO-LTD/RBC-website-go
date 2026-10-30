import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCustomerPhone,
  validateDemoOtp,
  isDemoCustomer,
} from "../src/lib/customer-auth";

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
test("demo OTP checks the exact code and its expiry", () => {
  assert.equal(validateDemoOtp("123456", 2000, 1000), null);
  assert.equal(validateDemoOtp("000000", 2000, 1000), "invalid");
  assert.equal(validateDemoOtp("123456", 2000, 2000), "expired");
});
test("only a well-formed demo profile can populate the customer UI", () => {
  assert.equal(
    isDemoCustomer({
      kind: "demo",
      id: "test",
      name: "Test",
      email: "demo@example.com",
      phone: "",
      method: "google",
    }),
    true,
  );
  assert.equal(
    isDemoCustomer({
      kind: "real",
      id: "test",
      name: "Test",
      email: "",
      phone: "",
      method: "google",
    }),
    false,
  );
  assert.equal(isDemoCustomer({ kind: "demo", name: null }), false);
});
