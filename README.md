# RBC GO — Next.js + Tailwind CSS + shadcn/ui

เว็บต้นแบบที่รันได้จริงสำหรับ RBC GO พร้อมภาษาไทย อังกฤษ และจีนตัวย่อ ย้ายจากต้นแบบ HTML เดิมมาเป็น React components และ Next.js App Router โดยใช้ Tailwind utility classes ใน `className` และคอมโพเนนต์ shadcn/ui (Radix)

> **สถานะปัจจุบัน:** ยังเป็น frontend demo ไม่ควรเปิดรับการจองหรือชำระเงินจริง ดูข้อจำกัดและงานที่ต้องทำก่อนเปิดใช้งานจริงในหัวข้อ “ขอบเขตของเวอร์ชันนี้”

## สาขา Git

- `dev` — สาขาหลักสำหรับแก้ไขและทดสอบงานใหม่ เปิด pull request จากสาขางานเข้าที่นี่
- `main` — สาขาสำหรับ release และเชื่อมระบบ deploy production เมื่อระบบหลังบ้านและการชำระเงินจริงพร้อมแล้ว รวมงานที่ผ่านการตรวจจาก `dev` เท่านั้น

การมี production build ไม่ได้แปลว่าระบบธุรกิจพร้อมใช้งานจริง ขณะนี้ยังไม่ควรตั้งค่า auto-deploy `main` เป็นเว็บสาธารณะ

## เริ่มใช้งาน

ต้องมี Node.js 20.9 ขึ้นไป (ตรวจสอบด้วย Node.js 22.14.0)

```bash
npm ci
npm run dev
```

เปิด http://localhost:3000 — จะเข้าสู่ `/th` เป็นค่าเริ่มต้น กด EN เพื่อเปลี่ยนเป็นภาษาอังกฤษ เส้นทาง `/th/...` และ `/en/...` ใช้งานแยกตามภาษา

สร้างและเปิด production build:

```bash
npm run build
npm run start
```

ตรวจโค้ดและตรรกะ:

```bash
npm run typecheck
npm test
```

โปรเจกต์เปิด watch polling อัตโนมัติผ่าน `scripts/dev.mjs` เพื่อรองรับข้อจำกัด file watcher บน macOS และตั้ง Webpack กับ Tailwind PostCSS ไว้แล้ว ส่วนประกอบ UI ทั้งหมดอยู่ในซอร์ส สามารถแก้ได้โดยตรง

## เทคโนโลยี

- Next.js 16.4.3 · App Router · TypeScript
- React 19.3.0
- Tailwind CSS 4 ผ่าน PostCSS; layout และ responsive styles อยู่ใน `className`
- shadcn/ui: Button, Card, Field, Input, Select, Badge, Alert, Empty, Separator, Sheet, Dialog, Checkbox, ToggleGroup, Table, Textarea, Sonner, Skeleton
- ภาษาอังกฤษใช้ Inter Variable; ภาษาไทยใช้ Thonburi → Tahoma ตามฟอนต์ที่มีในเครื่อง พร้อม Noto Sans Thai Variable ที่บันเดิลไว้เป็น fallback ไม่ต้องโหลดฟอนต์จาก Google ตอน build
- รูปภาพอยู่ใน `public/images/` และแสดงผ่าน `next/image`

`globals.css` เก็บเฉพาะสี ฟอนต์ design tokens และ base styles สีหลักตรงกับบรีฟ: #081321, #F4F6F8, #FFFFFF, #334B78, #172338, #D9DFE7

## โครงสร้าง

```text
src/app/
  layout.tsx                 root layout และ metadata
  page.tsx                   redirect ไปภาษาไทย
  [locale]/layout.tsx         provider และ navigation
  [locale]/[[...slug]]/       App Router พร้อมตรวจ route ที่อนุญาต
  error.tsx / not-found.tsx   หน้าผิดพลาด
src/components/rbc/
  provider.tsx               state และ localStorage แบบมี version
  shell.tsx                  ประกอบ layout หลักและแสดงสถานะของเดโม
  discovery.tsx              หน้าแรก ผลค้นหา และรายละเอียดยานพาหนะ
  search-panel.tsx           ฟอร์มค้นหาตามหมวดยานพาหนะ
  booking.tsx                ข้อมูลผู้เดินทาง ยืนยันการจอง และใบเสร็จ
  design.tsx                 experiences, help, design guide
  common.tsx                 คอมโพเนนต์ใช้งานร่วมกัน
src/components/layout/
  navbar.tsx                 Navbar, เมนูมือถือ และ Sign In
  footer.tsx                 Footer
  workspace-shell.tsx        โครงหน้าและเมนูของพื้นที่ทำงานแต่ละบทบาท
src/components/customer/     บัญชีลูกค้า แยก bookings, saved, payments, messages, profile
src/components/partner/      พอร์ทัล ใบสมัคร wizard ปฏิทิน และแท็บของพาร์ตเนอร์
src/components/operations/   ภาพรวม ประวัติ ตารางข้อมูล และ drawer จัดการของทีมงาน
src/components/booking/
  checkout.tsx               จอง 3 ขั้น: ข้อมูล → แพ็กเกจ → ชำระเงิน
  package-picker.tsx         แพ็กเกจเสริมตามหมวดยานพาหนะ
  payment-gateway.tsx        หน้ากรอกบัตรทดสอบและ PromptPay จำลอง
src/components/ui/           ซอร์ส shadcn/ui
src/lib/domain.ts            ประเภทข้อมูล ราคาและกฎการจอง
src/lib/inventory.json       ยานพาหนะตัวอย่าง
src/lib/i18n.ts             ตัวเรียกคำแปลและรูปแบบตัวเลข/วันที่
src/lib/translations/th/    คำแปลไทยแยกตามหน้าและส่วนงาน
public/images/              ภาพประกอบจากต้นแบบเดิม
tests/booking.test.ts       ราคา แพ็กเกจ การจองซ้ำ และสถานะสำคัญ
tests/payment.test.ts       การตรวจข้อมูลบัตรทดสอบ
```

คำแปลไทยอยู่ใน `src/lib/translations/th/`: `home.json`, `search.json`, `vehicle.json`, `booking.json`, `account.json`, `partner.json`, `operations.json`, `experiences.json`, `guide.json` และ `catalog.json` สำหรับชื่อสถานที่/ยานพาหนะ คำที่ใช้หลายหน้ารวมใน `shared.json` ส่วน `legacy.json` เก็บข้อความจากต้นแบบเดิมที่ยังไม่มีจุดเรียกใช้งานชัดเจน เวลาเพิ่มคำใหม่ให้เลือกไฟล์ของหน้าที่ใช้ก่อน; ถ้าใช้หลายหน้าให้ใส่ `shared.json` โค้ดยังเรียกผ่าน `t("English text")` ตามเดิม

## หน้าและเส้นทาง

บรีฟต้นฉบับไม่ได้กำหนดจำนวนหน้าตายตัว โปรเจกต์นี้จัดเป็นกลุ่มหน้าตามตารางด้านล่าง และมีหน้าย่อยตามหมวด ยานพาหนะ บทบาท และขั้นตอน ไม่ได้นับไทย/อังกฤษหรือเดสก์ท็อป/มือถือเป็นคนละหน้า

| กลุ่ม | ตัวอย่างเส้นทางหลัง `/th` หรือ `/en` |
|---|---|
| หน้าแรก | `/` |
| ค้นหา | `/search/boats`, `/search/motorcycles`, `/search/cars`, `/search/jets` |
| ยานพาหนะ | `/vehicle/mercedes`, `/vehicle/azimut` |
| ชำระเงิน | `/checkout/mercedes` |
| ผลการจอง | `/confirmation` |
| บัญชีลูกค้า | `/account/bookings`, `saved`, `payments`, `messages`, `profile` |
| สมัครพาร์ตเนอร์ | `/apply` |
| สร้างรายการ 8 ขั้นตอน | `/wizard/0` ถึง `/wizard/7` |
| พาร์ตเนอร์ | `/partner/overview`, `listings`, `availability`, `requests`, `bookings`, `earnings`, `profile` |
| ทีมปฏิบัติการ | `/operations/overview`, `partners`, `listings`, `requests`, `bookings`, `fleet`, `payments`, `activity` |
| รวมประสบการณ์ | `/experiences` |
| รายละเอียดประสบการณ์ | `/experience/andaman`, `/experience/coast` |
| ช่วยเหลือ | `/help` |
| คู่มือการออกแบบ | `/guide` |

## Login / Register ของลูกค้า

Navbar มีปุ่มเข้าสู่ระบบและสมัครสมาชิก บนมือถือเปิดได้จากเมนูหรือปุ่มบัญชีด้านล่าง หน้าต่างรองรับเบอร์โทรพร้อมรหัสประเทศ และตัวเลือก Google / Facebook

- เบอร์โทร: กรอกชื่อเมื่อสมัครสมาชิก → กรอกเบอร์มือถือ → OTP ทดสอบ `123456` → เข้าสู่บัญชีสาธิต
- ตรวจรูปแบบเบอร์ไทย/ต่างประเทศ, รหัสผิด, รหัสหมดอายุ 5 นาที และเว้นระยะส่งรหัสใหม่ 30 วินาที
- Google / Facebook: เปิดหน้าทดลองบัญชีสาธิต โดยไม่มีการเชื่อมบัญชีหรือส่งข้อมูลให้ผู้ให้บริการจริง
- เมื่อเข้าสู่บัญชี ปุ่ม Navbar เปลี่ยนเป็น “บัญชีของฉัน” สถานะเดโมคงอยู่เมื่อรีเฟรช และออกจากระบบได้ในโปรไฟล์
- ยังไม่มี OAuth, SMS, server session หรือการบังคับสิทธิ์จริง รหัส OTP ทดสอบไม่ถูกเก็บใน localStorage; มีเพียงโปรไฟล์สาธิตใน state ของแอป

คอมโพเนนต์อยู่ใน `src/components/customer/auth/` และกฎตรวจข้อมูลอยู่ใน `src/lib/customer-auth.ts` การเปิดใช้จริงต้องเชื่อมบริการยืนยันตัวตน พร้อม Google/Facebook OAuth และ SMS provider ที่เลือก

## ทดลองเส้นทางหลัก

ลูกค้าจองยานพาหนะทุกหมวดได้ทันทีจากราคาตัวอย่างที่แสดง ไม่ต้องขอหรือรอใบเสนอราคา เส้นทาง `/request/:id` เดิมจะไปหน้า checkout และ `/quote` เดิมจะไปหน้าการจอง

1. เลือกยานพาหนะและวันที่ → ตรวจสอบความพร้อม → ดำเนินการต่อ
2. **ข้อมูลการจอง:** ตรวจวันเดินทางและกรอกชื่อ อีเมล เบอร์โทร → ดำเนินการต่อ
3. **เพิ่มแพ็กเกจ:** เลือกบริการเสริมตามหมวด หรือข้ามได้ ยอดรวมอัปเดตพร้อมภาษีทันที
4. **ชำระเงิน:** เลือกบัตรเครดิต/เดบิต หรือ PromptPay → ยอมรับเงื่อนไข → เปิดหน้าระบบชำระเงินจำลอง
5. บัตรทดสอบ: กด “ใช้บัตรทดสอบ” หรือกรอก `4242 4242 4242 4242`, วันหมดอายุในอนาคต และรหัส 3 หลัก → ชำระ → ยืนยันการจอง พร้อมแพ็กเกจและช่องทางชำระเงิน
6. ทดสอบไม่สำเร็จด้วยบัตร `4000 0000 0000 0002` แล้วลองใหม่ ข้อมูลผู้เดินทางและแพ็กเกจยังอยู่
7. PromptPay แสดง QR สาธิตที่รับเงินไม่ได้ ใช้ปุ่มจำลองการชำระเพื่อทดสอบผลสำเร็จ/ไม่สำเร็จ

ข้อมูลบัตรทดสอบอยู่เฉพาะ state ภายในหน้าต่างชำระเงิน ไม่บันทึกใน localStorage และไม่ส่งออกไปยังเซิร์ฟเวอร์ ไม่มีการเรียกเก็บเงินจริง

พาร์ตเนอร์ยังสมัครและสร้างรายการได้ 8 ขั้นตอน ทีมงานอนุมัติพาร์ตเนอร์และรายการได้ตามเดิม การยกเลิกและคืนเงินยังเป็นเดโมผ่าน Account → Operations/Payments

## ขอบเขตของเวอร์ชันนี้

นี่คือ **frontend demo ที่รันด้วย Next.js** พร้อม state ที่เชื่อมโยงหน้าต่าง ๆ ยังไม่ได้เชื่อมระบบธุรกิจจริง:

- ข้อมูลอยู่ใน localStorage คีย์ `rbc-go-next-v1` ของเบราว์เซอร์ ไม่มีฐานข้อมูลหรือการแชร์ข้ามอุปกรณ์
- บทบาท Customer / Partner / Operations เป็นการจำลอง UI ยังไม่มีระบบลงชื่อเข้าใช้หรือการบังคับสิทธิ์ที่เซิร์ฟเวอร์
- เก็บเฉพาะชื่อไฟล์ที่เลือก ไม่มีการอัปโหลดไฟล์จริง คำขอและข้อความไม่ถูกส่งให้บุคคลภายนอก
- ปฏิทินพาร์ตเนอร์ใช้ชุดวันที่ปิดรับจองร่วมกันในเดโม รายการใหม่ที่อนุมัติยังไม่ถูกเผยแพร่เป็น inventory จริง
- การชำระเงิน คืนเงิน และ payout เป็น simulation ไม่มีการเก็บข้อมูลบัตรและไม่มีธุรกรรมจริง
- ราคา ภาษี ค่าคอมมิชชัน รีวิว และภาพประกอบเป็นตัวอย่าง ไม่ใช่ข้อเสนอธุรกิจจริง
- USD ใช้อัตราตัวอย่าง 35 บาท/ดอลลาร์ เพื่อการแสดงผล ฐานราคาคิดเป็น THB

ก่อนเปิดรับลูกค้าจริง ต้องเชื่อมฐานข้อมูล inventory, authentication และสิทธิ์แต่ละบทบาท, บริการไฟล์, payment gateway/webhook/idempotency ฝั่งเซิร์ฟเวอร์, ระบบแจ้งเตือน และกำหนดนโยบายธุรกิจจริง

## เอกสารอ้างอิง

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [shadcn/ui](https://ui.shadcn.com/docs)
