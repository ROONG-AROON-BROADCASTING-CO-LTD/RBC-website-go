# RBC GO — Next.js + Tailwind CSS + shadcn/ui

เว็บต้นแบบที่รันได้จริงสำหรับ RBC GO พร้อมภาษาไทย อังกฤษ และจีนตัวย่อ ย้ายจากต้นแบบ HTML เดิมมาเป็น React components และ Next.js App Router โดยใช้ Tailwind utility classes ใน `className` และคอมโพเนนต์ shadcn/ui (Radix)

> **สถานะปัจจุบัน:** รายการพาร์ทเนอร์ที่อนุมัติแล้วรับคำขอจอง เสนอราคา และชำระผ่าน Omise **โหมดทดสอบ** โดยบันทึกใน PostgreSQL; ไม่มีการตัดเงินจริง รายการตัวอย่างเดิมและ checkout เดิมยังเป็นเดโม ห้ามเปิดรับเงินจริงจนกว่าจะทดสอบและตั้งค่าระบบ production ครบ

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

## PostgreSQL สำหรับระบบใช้งานจริง

โครงสร้างฐานข้อมูลอยู่ใน `db/migrations/` และใช้ schema `rbc_go` แยกจากตารางอื่นในฐานข้อมูลเดียวกัน ต้องใช้ PostgreSQL 14 ขึ้นไปและสิทธิ์สร้าง extension `btree_gist` สำหรับป้องกันการจองเวลาซ้อน

1. คัดลอก `.env.example` เป็น `.env.local` แล้วตั้ง `DATABASE_URL` ให้ชี้ไปยังฐานข้อมูลของโครงการ โดยเก็บรหัสผ่านไว้เฉพาะในเครื่องและ secret store ของระบบ deploy
2. รัน `npm run db:migrate:local` หลังดึงโค้ดใหม่ คำสั่งจะข้าม migration ที่ติดตั้งแล้ว บนเซิร์ฟเวอร์ที่ตั้ง `DATABASE_URL` ใน environment ใช้ `npm run db:migrate`
3. เปิด `/api/health` เพื่อตรวจการเชื่อมต่อฐานข้อมูล: `ok` หมายถึงต่อได้, HTTP 503 หมายถึงยังไม่ตั้งค่าหรือต่อไม่ได้

แพ็กเกจไดรเวอร์ `postgres` เวอร์ชัน 3.4.7 อยู่ใน `vendor/` เพื่อให้ติดตั้งซ้ำได้ในสภาพแวดล้อมที่ npm registry ถูกจำกัด ใช้ `package-lock.json` และ npm เป็นตัวจัดการ dependency หลัก

### สมัครและตรวจพาร์ทเนอร์

- ก่อนเปิดสมัคร ให้ยืนยันโดเมนผู้ส่งใน [Resend](https://resend.com/docs/dashboard/domains/introduction) และตั้ง `RESEND_API_KEY` กับ `EMAIL_FROM` (เช่น `RBC GO <no-reply@โดเมนจริง>`) ใน secret store; สร้าง `PARTNER_OTP_SECRET` เป็นสตริงสุ่มอย่างน้อย 32 ตัวอักษร แยกจาก API key ห้ามใส่ค่าลับใน repository หากยังไม่ตั้งค่าครบ ปุ่มสมัครจะไม่ส่งรหัสหรือสร้างบัญชี
- `/th/partner-signup` ส่งรหัส OTP 6 หลักไปยังอีเมลผู้สมัครและสร้างบัญชีหลังยืนยันรหัสเท่านั้น รหัสหมดอายุใน 10 นาที ขอใหม่ได้หลัง 1 นาที; `/th/partner-login` เข้าสู่ระบบ Session อยู่ใน cookie แบบ HttpOnly และฐานข้อมูล; password แฮชด้วย scrypt
- `/th/apply` ยื่นชื่อธุรกิจและไฟล์ PDF/JPG/PNG จริง ลง PostgreSQL (สูงสุด 10 MB ต่อไฟล์) สถานะใบสมัครและเอกสารถูกอ่านจากฐานข้อมูล
- `/th/operations/partners` เป็นคิวตรวจสำหรับบัญชีที่มีบทบาท `admin` หรือ `reviewer` เท่านั้น อนุมัติ/ขอแก้ไข/ปฏิเสธผ่าน transaction; เอกสารดาวน์โหลดได้เฉพาะเจ้าของใบสมัครหรือผู้ตรวจ
- `/th/partner/...` และ `/th/wizard/...` ตรวจสิทธิ์บนเซิร์ฟเวอร์ก่อนแสดงหน้า ผู้สมัครที่ยังไม่ผ่านจะถูกส่งกลับ `/th/apply`
- `/th/partner/overview` แสดงรายการจากฐานข้อมูลและรับข้อมูลยานพาหนะพร้อมรูปจริง; `/th/operations/listings` ให้ผู้ตรวจอนุมัติหรือขอแก้ไขรายการ รายการที่อนุมัติจากพาร์ทเนอร์ที่ยัง active จะแสดงในหน้าค้นหาและเปิดรับคำขอจองที่ `/th/listing/:id`
- รายการที่ถูกขอแก้ไขเปิดฟอร์มแก้ข้อมูลเดิมได้ใน `/th/partner/overview` และส่งกลับเข้าคิวตรวจอีกครั้งโดยใช้ ID เดิม รูปใหม่จะแทนที่รูปเดิมทั้งหมด; เว้นช่องรูปว่างไว้เพื่อใช้รูปเดิม

### คำขอจองและ Omise sandbox

- ลูกค้าที่เข้าสู่ระบบเปิด `/th/listing/:id` เพื่อเลือกวันเวลาและส่งคำขอจอง พาร์ทเนอร์ที่มีสิทธิ์ใช้ `/th/partner/overview` เพื่อปฏิเสธหรือเสนอราคาสุทธิ คำขอและราคาบันทึกใน PostgreSQL (`db/migrations/005_partner_bookings.sql`)
- ลูกค้าดูสถานะที่ `/th/partner-bookings` และชำระได้หลังรับราคา ระบบถือช่วงเวลาไว้ 48 ชั่วโมงและป้องกันการตอบรับช่วงเวลาซ้อนในฐานข้อมูล
- ตั้ง `OMISE_PUBLIC_KEY`, `OMISE_SECRET_KEY`, `OMISE_WEBHOOK_SECRET` จาก **test mode** ใน Omise และ `APP_BASE_URL` เป็น HTTPS origin ของเว็บที่เผยแพร่ เก็บ secret เฉพาะ `.env.local` หรือ secret store ห้ามใช้ live keys กับโค้ดนี้
- ตั้ง webhook test endpoint ใน Omise เป็น `https://YOUR_DOMAIN/api/omise/webhook`; การทดสอบบน localhost ใช้การอ่านสถานะ charge จาก Omise เมื่อเปิดหน้าการจองอีกครั้ง
- ระบบนี้ใช้ Omise.js ให้ข้อมูลบัตรส่งตรงเข้า Omise; เซิร์ฟเวอร์ได้รับเฉพาะ token ทดสอบ ตรวจ `amount`, `currency`, `ref_id` และสถานะ charge ก่อนยืนยันการจอง หากการเรียก API ขาดช่วง ระบบจะหยุดการชำระซ้ำจนกว่าทีมงานตรวจสอบรายการ
- การส่งอีเมลแจ้งเตือนคำขอ/การตอบรับ และการชำระเงินจริงยังต้องตั้งค่าบริการเพิ่ม; ระบบปัจจุบันต้องให้ลูกค้าและพาร์ทเนอร์เข้าดูสถานะในเว็บ

ทดสอบ workflow กับฐานข้อมูลทดสอบที่ชื่อจบด้วย `_test` หลังรัน migration แล้ว:

```bash
RBC_GO_TEST_DATABASE_URL=postgresql://USER@localhost:5432/rbc_go_test node --import tsx --test tests/postgres-workflow.test.ts
```

HTTP smoke tests ต้องเปิดแอปอีกพอร์ตด้วยฐานข้อมูลทดสอบหลัง build ก่อน แล้วจึงรัน:

```bash
DATABASE_URL=postgresql://USER@localhost:5432/rbc_go_test npm run start -- -p 3101
RBC_GO_TEST_DATABASE_URL=postgresql://USER@localhost:5432/rbc_go_test RBC_GO_TEST_BASE_URL=http://localhost:3101 node --import tsx --test tests/email-auth-http.test.ts tests/public-inventory-http.test.ts
```

บัญชีผู้ตรวจต้องสร้างโดยผู้ดูแลระบบเท่านั้น: สมัครบัญชีพาร์ทเนอร์ตามปกติ จากนั้นให้ผู้ดูแลฐานข้อมูลเพิ่ม `account_id` ที่ตรวจสอบแล้วลง `rbc_go.staff_members` ด้วย role `reviewer` หรือ `admin` โดยตรง ห้ามเปิดปุ่มแต่งตั้งตนเองใน UI

**ข้อจำกัดสำคัญ:** OTP ยืนยันอีเมลเฉพาะการสมัครพาร์ทเนอร์; บัญชีอีเมลลูกค้ายังไม่ยืนยันและยังไม่มีกู้รหัสผ่าน ห้ามอนุมัติใบสมัครโดยไม่ตรวจสอบตัวตนและเอกสารจริง การชำระเงินรายการพาร์ทเนอร์ใช้ Omise sandbox เท่านั้น ส่วนหน้าตัวอย่างเดิมยังไม่ใช่การจองจริง

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

| กลุ่ม                 | ตัวอย่างเส้นทางหลัง `/th` หรือ `/en`                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| หน้าแรก               | `/`                                                                                                                                                 |
| ค้นหา                 | `/search/boats`, `/search/motorcycles`, `/search/cars`, `/search/jets`                                                                              |
| ยานพาหนะ              | `/vehicle/mercedes`, `/vehicle/azimut`                                                                                                              |
| รายการพาร์ทเนอร์จริง  | `/listing/:id` แสดงรายการที่อนุมัติและรับคำขอจอง; `/partner-bookings` ติดตามคำขอและชำระผ่าน Omise sandbox                                             |
| ชำระเงิน              | `/checkout/mercedes`                                                                                                                                |
| ผลการจอง              | `/confirmation`                                                                                                                                     |
| บัญชีลูกค้า           | `/account/bookings`, `saved`, `payments`, `messages`, `profile`                                                                                     |
| สมัครพาร์ตเนอร์       | `/partner-signup`, `/partner-login`, `/apply`                                                                                                       |
| บัญชีอีเมลลูกค้า      | `/email`, `/email?mode=register`                                                                                                                    |
| สร้างรายการ 8 ขั้นตอน | `/wizard/0` ถึง `/wizard/7`                                                                                                                         |
| พาร์ตเนอร์            | `/partner/overview`, `listings`, `availability`, `requests`, `bookings`, `earnings`, `profile`                                                      |
| ทีมปฏิบัติการ         | `/operations/partners` (ตรวจใบสมัครจริง); `/operations/overview`, `listings`, `requests`, `bookings`, `fleet`, `payments`, `activity` (ข้อมูลทดลอง) |
| รวมประสบการณ์         | `/experiences`                                                                                                                                      |
| รายละเอียดประสบการณ์  | `/experience/andaman`, `/experience/coast`                                                                                                          |
| ช่วยเหลือ             | `/help`                                                                                                                                             |
| คู่มือการออกแบบ       | `/guide`                                                                                                                                            |

## Login / Register ของลูกค้า

Navbar มีปุ่มเข้าสู่ระบบและสมัครสมาชิก บนมือถือเปิดได้จากเมนูหรือปุ่มบัญชีด้านล่าง หน้าต่างรองรับเบอร์โทรพร้อมรหัสประเทศ รวมทั้งทางเข้า Email และ Google

- อีเมล: `/th/email` เข้าสู่ระบบและ `/th/email?mode=register` สมัครด้วยชื่อ อีเมล และรหัสผ่านอย่างน้อย 12 ตัวอักษร บัญชีและ session อยู่ใน PostgreSQL ร่วมกับระบบพาร์ทเนอร์
- Google: OAuth 2.0/OpenID Connect แลก code และตรวจลายเซ็น ID token, issuer, audience, วันหมดอายุ และ nonce ฝั่งเซิร์ฟเวอร์ จากนั้นสร้างบัญชีด้วย Google `sub` และ session ใน PostgreSQL ตั้ง `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` และ `GOOGLE_REDIRECT_URI` ใน environment พร้อมลงทะเบียน redirect URI เดียวกันใน Google Cloud Console หากยังไม่ตั้งค่า ปุ่ม Google จะแจ้งว่าไม่พร้อมและไม่สร้างบัญชีเดโม
- เบอร์โทร: กรอกชื่อเมื่อสมัครสมาชิก → กรอกเบอร์มือถือ → OTP ทดสอบ `123456` → เข้าสู่บัญชีสาธิต
- ตรวจรูปแบบเบอร์ไทย/ต่างประเทศ, รหัสผิด, รหัสหมดอายุ 5 นาที และเว้นระยะส่งรหัสใหม่ 30 วินาที
- เมื่อเข้าสู่บัญชี ปุ่ม Navbar “บัญชีของฉัน” เปิดเมนูข้อมูลลูกค้า การจอง รีวิว และรายการที่บันทึก; email/Google ใช้ cookie แบบ HttpOnly ส่วนเดโมเบอร์โทรคงอยู่ใน browser
- ยังไม่มี SMS จริง; รหัส OTP ทดสอบไม่ถูกเก็บใน localStorage

คอมโพเนนต์อยู่ใน `src/components/customer/auth/` และกฎตรวจข้อมูลเดโมอยู่ใน `src/lib/customer-auth.ts` Google Login ทดสอบ end-to-end สำเร็จบน localhost:3000 โดยใช้โปรเจกต์ Google Cloud `rbc-go-auth-2026-10` และบัญชีทดสอบ IT; ค่าลับอยู่เฉพาะใน `.env.local` ที่ Git ignore และไม่ควรคัดลอกลง repository ขณะนี้ Google Auth Platform ยังอยู่ในโหมด Testing จึงใช้ได้เฉพาะ test users ที่เพิ่มใน Audience เมื่อมีโดเมนจริงต้องเพิ่ม redirect URI ของโดเมนนั้นและเตรียม Branding/การเผยแพร่ก่อนเปิดให้ลูกค้าทั่วไป บัญชี Google จะไม่เชื่อมกับบัญชีอีเมลโดยอัตโนมัติแม้อีเมลตรงกัน

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

ขั้นตอน 1–7 ด้านบนเป็นเดโมสำหรับยานพาหนะตัวอย่าง ส่วนรายการพาร์ทเนอร์ที่อนุมัติแล้วใช้คำขอจองและ Omise sandbox ตามหัวข้อด้านบน; การคืนเงินยังไม่ได้เชื่อมระบบจริง

## ขอบเขตของเวอร์ชันนี้

นี่คือ **เว็บที่กำลังเชื่อม backend** ยังไม่พร้อมเปิดใช้งานธุรกิจจริง:

- ข้อมูลลูกค้าที่บันทึกหลังเข้าสู่บัญชีจริงอยู่ใน PostgreSQL (`rbc_go.customer_profiles`) และแยกตามบัญชี; การจองและการชำระเงินของยานพาหนะตัวอย่างยังอยู่ใน localStorage คีย์ `rbc-go-next-v1` ของเบราว์เซอร์; คำขอจองรายการพาร์ทเนอร์ บัญชีอีเมล ใบสมัคร และรายการที่เผยแพร่ใช้ PostgreSQL
- หน้า “รีวิวของฉัน” แสดงสถานะว่างตามจริง ขณะนี้ยังไม่เปิดให้ส่งรีวิวจนกว่าการจองจริงจะเชื่อมกับระบบหลังบ้าน
- Customer email และ Google login ใช้ session จริงใน PostgreSQL; Google ใช้ได้ในโหมด Testing สำหรับบัญชีที่เพิ่มใน Google Cloud Audience เท่านั้น; phone/SMS ยังจำลอง ส่วน Partner login, ใบสมัคร และการเข้าหน้าพาร์ทเนอร์/ตรวจใบสมัครมีการบังคับสิทธิ์บนเซิร์ฟเวอร์
- เอกสารใบสมัครและรูปยานพาหนะในหน้าใหม่ถูกอัปโหลดจริง ส่วน wizard เดิมไม่เปิดให้ใช้แล้ว
- ปฏิทินพาร์ตเนอร์ใช้ชุดวันที่ปิดรับจองร่วมกันในเดโม รายการที่อนุมัติแสดงในหน้าค้นหาแล้ว แต่ยังจองไม่ได้
- การชำระเงิน คืนเงิน และ payout เป็น simulation ไม่มีการเก็บข้อมูลบัตรและไม่มีธุรกรรมจริง
- ราคา ภาษี ค่าคอมมิชชัน รีวิว และภาพประกอบเป็นตัวอย่าง ไม่ใช่ข้อเสนอธุรกิจจริง
- USD ใช้อัตราตัวอย่าง 35 บาท/ดอลลาร์ เพื่อการแสดงผล ฐานราคาคิดเป็น THB

ก่อนเปิดรับลูกค้าจริง ต้องเชื่อมการจองกับ inventory ใน PostgreSQL, ยืนยันอีเมลและตัวตน, บริการไฟล์ที่เหมาะกับการใช้งานจริง, payment gateway/webhook/idempotency ฝั่งเซิร์ฟเวอร์, ระบบแจ้งเตือน และกำหนดนโยบายธุรกิจจริง

## เอกสารอ้างอิง

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [shadcn/ui](https://ui.shadcn.com/docs)
