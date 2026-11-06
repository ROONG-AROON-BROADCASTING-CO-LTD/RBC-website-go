import test from "node:test";
import assert from "node:assert/strict";
import { searchCategoryForPath } from "../src/lib/domain";
import { accountAreaForPath } from "../src/lib/account-area";

test("partner authentication, application and workspace routes use partner navigation", () => {
  for (const locale of ["th", "en", "zh"]) {
    for (const route of [
      "partner-login",
      "partner-signup",
      "apply",
      "partner",
      "partner/overview",
      "wizard/0",
    ]) {
      assert.equal(accountAreaForPath(`/${locale}/${route}`), "partner");
    }
    assert.equal(
      accountAreaForPath(`/${locale}/operations/payments`),
      "operations",
    );
  }
});

test("customer booking pages keep customer navigation despite the partner-bookings prefix", () => {
  for (const route of [
    "/th",
    "/en/email",
    "/zh/account/profile",
    "/th/partner-bookings",
    "/en/partner-bookings/123",
    "/th/partner-login-extra",
  ]) {
    assert.equal(accountAreaForPath(route), "customer");
  }
});

test("mobile search follows the category in the current URL rather than an old search", () => {
  assert.equal(searchCategoryForPath("/th/search/cars", "boats"), "cars");
  assert.equal(searchCategoryForPath("/en/search/jets", "cars"), "jets");
  assert.equal(searchCategoryForPath("/zh/search/boats", "cars"), "boats");
});
test("retired vehicle URLs cannot restore a sample inventory category", () => {
  assert.equal(searchCategoryForPath("/th/vehicle/mercedes", "boats"), "boats");
  assert.equal(
    searchCategoryForPath("/en/checkout/citation", "boats"),
    "boats",
  );
});
test("other pages safely fall back to the saved search category", () => {
  assert.equal(
    searchCategoryForPath("/th/account/bookings", "motorcycles"),
    "motorcycles",
  );
  assert.equal(searchCategoryForPath("/th/search/unknown", "boats"), "boats");
});
