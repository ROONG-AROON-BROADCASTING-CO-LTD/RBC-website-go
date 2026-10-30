import test from "node:test";
import assert from "node:assert/strict";
import { formatDate, translate } from "../src/lib/i18n";

test("Thai translations still resolve across page dictionaries", () => {
  assert.equal(translate("th", "Your journey."), "การเดินทางของคุณ");
  assert.equal(translate("th", "Search Vehicles"), "ค้นหายานพาหนะ");
  assert.equal(translate("th", "Payment gateway"), "ระบบชำระเงิน");
  assert.equal(translate("th", "Register"), "สมัครสมาชิก");
  assert.equal(translate("th", "Staff tools"), "เครื่องมือทีมงาน");
});

test("English and composed Thai labels keep the existing behavior", () => {
  assert.equal(translate("en", "Payment gateway"), "Payment gateway");
  assert.equal(translate("th", "3 guests"), "3 คน");
  assert.equal(translate("th", "Phuket · 3 guests"), "ภูเก็ต · 3 คน");
});

test("Simplified Chinese translates navigation and formats dates", () => {
  assert.equal(translate("zh", "Search Vehicles"), "搜索交通工具");
  assert.equal(translate("zh", "Phuket · 3 guests"), "普吉岛 · 3 人");
  assert.match(formatDate("zh", "2026-11-15"), /2026年11月15日/);
});
