import test from "node:test";
import assert from "node:assert/strict";
import { parsePartnerCategories } from "../src/lib/partner-categories";

test("partner applications accept multiple categories with canonical ordering and no duplicates", () => {
  assert.deepEqual(parsePartnerCategories(["boats", "cars", "boats"]), [
    "cars",
    "boats",
  ]);
  assert.deepEqual(
    parsePartnerCategories(["jets", "boats", "motorcycles", "cars"]),
    ["cars", "motorcycles", "boats", "jets"],
  );
});

test("empty or tampered rental categories are rejected instead of silently dropped", () => {
  for (const values of [
    [],
    ["cars", "unknown"],
    ["Cars"],
    [null],
    [{ name: "cars" }],
  ]) {
    assert.equal(parsePartnerCategories(values), null);
  }
});
