"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  submitListing,
  type ListingFormResult,
} from "@/app/[locale]/partner/overview/actions";
import type { PartnerListing } from "@/lib/server/listings";

const initial: ListingFormResult = { error: "" };
const errors: Record<string, string> = {
  invalid_category: "กรุณาเลือกประเภทยานพาหนะ",
  invalid_title: "กรุณากรอกชื่อรายการ 2–200 ตัวอักษร",
  invalid_description: "กรุณากรอกสถานที่และตรวจความยาวคำอธิบาย",
  invalid_capacity: "จำนวนผู้โดยสารต้องอยู่ระหว่าง 1–200",
  invalid_price: "กรุณากรอกราคาให้ถูกต้อง",
  images_required: "กรุณาเลือกรูป 1–5 รูป",
  images_too_large: "รูปทั้งหมดรวมกันต้องไม่เกิน 10 MB",
  invalid_image_type: "รองรับ JPG, PNG และ WebP เท่านั้น",
  invalid_image_size: "รูปแต่ละใบต้องไม่เกิน 5 MB",
  invalid_image_name: "ชื่อรูปไม่ถูกต้อง",
  invalid_listing: "ไม่พบรายการที่ต้องการแก้ไข",
  listing_locked: "รายการนี้ไม่อยู่ในสถานะที่แก้ไขได้",
};

export function ListingForm({
  locale,
  listing,
}: {
  locale: string;
  listing?: PartnerListing;
}) {
  const [state, action, pending] = useActionState(submitListing, initial);
  return (
    <form
      action={action}
      className="space-y-5 rounded-3xl border bg-card p-6 shadow-sm md:p-8"
    >
      <input type="hidden" name="locale" value={locale} />
      {listing && <input type="hidden" name="listingId" value={listing.id} />}
      <h2 className="text-xl font-bold">
        {listing ? "แก้ไขรายการยานพาหนะ" : "เพิ่มยานพาหนะ"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {listing
          ? "แก้ข้อมูลตามคำแนะนำ แล้วส่งรายการเดิมให้ทีมงานตรวจอีกครั้ง"
          : "รายการใหม่จะส่งให้ทีมงานตรวจสอบก่อนเผยแพร่"}
      </p>
      <label className="block text-sm font-semibold">
        ประเภท
        <select
          name="category"
          required
          defaultValue={listing?.category ?? ""}
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
        >
          <option value="" disabled>
            เลือกประเภท
          </option>
          <option value="boats">เรือและเรือยอชต์</option>
          <option value="motorcycles">รถจักรยานยนต์</option>
          <option value="cars">รถยนต์</option>
          <option value="jets">เครื่องบินส่วนตัว</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">
        ชื่อรายการ
        <Input
          name="title"
          defaultValue={listing?.title}
          required
          minLength={2}
          maxLength={200}
          className="mt-2"
        />
      </label>
      <label className="block text-sm font-semibold">
        สถานที่
        <Input
          name="location"
          defaultValue={listing?.location_text}
          required
          maxLength={200}
          className="mt-2"
        />
      </label>
      <label className="block text-sm font-semibold">
        คำอธิบาย
        <textarea
          name="description"
          defaultValue={listing?.description}
          rows={3}
          maxLength={5000}
          className="mt-2 w-full rounded-lg border bg-background p-3"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-semibold">
          จำนวนผู้โดยสาร
          <Input
            name="capacity"
            defaultValue={listing?.capacity}
            type="number"
            min={1}
            max={200}
            required
            className="mt-2"
          />
        </label>
        <label className="block text-sm font-semibold">
          ราคาเริ่มต้น (บาท)
          <Input
            name="price"
            defaultValue={
              listing
                ? (Number(listing.base_price_satang) / 100).toFixed(2)
                : undefined
            }
            type="number"
            min="0.01"
            step="0.01"
            required
            className="mt-2"
          />
        </label>
        <label className="block text-sm font-semibold">
          เงินประกัน (บาท)
          <Input
            name="deposit"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              listing ? (Number(listing.deposit_satang) / 100).toFixed(2) : "0"
            }
            className="mt-2"
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        รูปยานพาหนะ
        <Input
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required={!listing}
          className="mt-2 h-auto py-3"
        />
        <span className="mt-2 block text-xs font-normal text-muted-foreground">
          {listing
            ? "เว้นว่างเพื่อใช้รูปเดิม หรือเลือก 1–5 รูปเพื่อแทนที่ทั้งหมด; รวมไม่เกิน 10 MB"
            : "1–5 รูป; รวมไม่เกิน 10 MB"}
        </span>
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {errors[state.error] ?? "ส่งรายการไม่สำเร็จ กรุณาลองอีกครั้ง"}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending
          ? "กำลังส่ง..."
          : listing
            ? "ส่งตรวจอีกครั้ง"
            : "ส่งรายการให้ตรวจสอบ"}
      </Button>
    </form>
  );
}
