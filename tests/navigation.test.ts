import test from "node:test";
import assert from "node:assert/strict";
import { searchCategoryForPath } from "../src/lib/domain";

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
