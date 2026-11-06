# RBC GO

Next.js 16.4.3 / React 19.3 / PostgreSQL พร้อม UI ไทย อังกฤษ และจีนตัวย่อ ใช้ npm และ Node.js 22 ขึ้นไป

ระบบบัญชี ใบสมัครพาร์ทเนอร์ รายการยานพาหนะ คำขอจอง ราคา การชำระเงิน ข้อความ รายการที่บันทึก รีวิว และปฏิทิน ใช้ข้อมูลฝั่งเซิร์ฟเวอร์ แยกสิทธิ์ตามบัญชี ข้อมูลยานพาหนะตัวอย่างถูกนำออกจากเว็บแล้ว หน้าแรก/ค้นหาใช้เฉพาะรายการที่อนุมัติจากฐานข้อมูล เส้นทางเดโมเดิมเปิดไม่ได้แม้มีค่า `ENABLE_DEMO` เก่าค้างอยู่

**สถานะ 7 พฤศจิกายน 2026:** เว็บมี production hosting บน Vercel ที่ https://rbc-website-go.vercel.app และยังใช้ Omise test mode การ deploy เว็บไม่ใช่การเปิดรับหรือโอนเงินจริง รุ่นนี้เพิ่มภาพรวมธุรกิจ รายได้แยกพาร์ทเนอร์ ค่าคอมมิชชันเริ่มต้น 10% คำขอถอนเงิน และหน้ารายละเอียดพร้อมแกลเลอรี ชุดทดสอบก่อน deploy ผ่าน 60/60 ข้อ พร้อม lint และ production build

เคยทดสอบชำระ คืนเงิน และ payout กับ Omise sandbox จริงแล้ว ระบบส่งอีเมลรองรับ Gmail/Resend และใช้ OTP อีเมลแทน SMS ตรวจ Gmail TLS/authentication และส่งอีเมลทดสอบเข้าบัญชีผู้ส่งสำเร็จ แต่ยังไม่ได้ตรวจ OTP/verification/reset/notification ทุกชนิดผ่านกล่องจดหมายจริง และยังต้องยืนยัน live keys, สิทธิ์จ่าย third-party recipients, webhook และ worker ของ environment ก่อนเปิดรับเงินจริง ขั้นตอนรับบริการเฉพาะเรือ รถจักรยานยนต์ รถยนต์ และเครื่องบินยังใช้สถานะ handover/completed ร่วมกัน ไม่ได้มีระบบ boarding/ตรวจใบขับขี่อัตโนมัติ

## เริ่มใช้งาน

```sh
npm ci
cp .env.example .env.local
# ตั้ง DATABASE_URL และค่าบริการที่ต้องใช้ โดยไม่ใส่ secret ลง Git
npm run db:migrate:local
npm run dev
```

เปิด http://localhost:3000 (ค่าเริ่มต้น `/th`) เส้นทางภาษาเป็น `/th`, `/en`, `/zh`

```sh
npm run build
npm run start
```

Build สร้าง standalone server และคัดลอก static assets ผ่าน `postbuild` แล้ว `npm run start` จะรัน standalone server โดยตรง รองรับ `-p` และ `-H` เช่น `npm run start -- -p 3100 -H localhost`

### PostgreSQL TLS / `SELF_SIGNED_CERT_IN_CHAIN`

บน Vercel runtime ใช้ Supabase shared pooler แบบ transaction (port 6543) อัตโนมัติเมื่อ `DATABASE_URL` เป็น shared pooler port 5432 โดยคง host/credential/database และการตรวจ TLS เดิม จำกัด pool ต่อ function เป็น 1 และปิด query pipelining (`max_pipeline: 0` พร้อม driver patch ใน `vendor/README.md`) เพื่อไม่ให้ serverless instances ใช้ session pool จนเกิด `EMAXCONNSESSION` สคริปต์ migration/backup ใช้ connection เดิม ไม่ถูกเปลี่ยนโหมด

เว็บและ migration ใช้ CA สาธารณะของ Supabase ที่รวมไว้ในโค้ดโดยอัตโนมัติเมื่อ `DATABASE_URL` ชี้ไปที่ `*.pooler.supabase.com` พร้อมตรวจ certificate และ hostname (`rejectUnauthorized: true`) ตาม [แนวทาง SSL ของ Supabase](https://supabase.com/docs/guides/platform/ssl-enforcement) จึงไม่ต้องปิดการตรวจสอบ TLS เพื่อแก้ error นี้

หากเกิดบน Vercel/โฮสต์อื่น ให้ deploy โค้ดล่าสุดและตรวจว่า `DATABASE_URL` ของ environment ที่มีปัญหาชี้ไปยัง pooler ที่ถูกต้อง สำหรับฐานข้อมูลผู้ให้บริการอื่นหรือเมื่อเปลี่ยน CA ให้ตั้ง `DATABASE_SSL_CA` เป็นเนื้อหา PEM ของ root CA ที่ดาวน์โหลดจากผู้ให้บริการ (รองรับทั้งหลายบรรทัดและ `\n`) แล้ว restart/redeploy ตัวแปรนี้ใช้เฉพาะฝั่งเซิร์ฟเวอร์และมีผลทั้งเว็บกับ migration ไม่ใช่ path ของไฟล์ ส่วนการเชื่อมต่ออื่นที่ไม่ได้ระบุ CA ยังคงใช้ SSL settings จาก URL ตามเดิม

## ตรวจระบบ

```sh
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run setup:check
```

`npm test` ข้าม integration tests ถ้าไม่มี test environment ส่วน `npm run test:integration` จะ:

1. ใช้ `RBC_GO_TEST_DATABASE_URL` ที่ชื่อฐานข้อมูลจบ `_test`; หากไม่ระบุ จะใช้ `rbc_go_test` บน PostgreSQL ในเครื่องตาม connection เดิมเท่านั้น
2. ติดตั้ง migration ในฐานทดสอบก่อนทุกครั้ง โดยไม่แก้ฐานหลัก
3. Build และเปิด standalone server ที่ `http://localhost:3101`
4. รันทดสอบทั้งหมด แล้วปิดเซิร์ฟเวอร์

สร้างฐาน `rbc_go_test` ไว้ก่อน และใช้ PostgreSQL 14+ พร้อมสิทธิ์ติดตั้ง `btree_gist` ชุด integration ปิดค่าบริการส่งข้อความและแทนที่ Omise keys ด้วยค่าทดสอบ เพื่อไม่ส่งข้อความหรือธุรกรรมออกไปโดยไม่ตั้งใจ การทดสอบกับ Omise sandbox จริงทำแยกต่างหาก

`/api/health` คืน 200 เมื่อเชื่อมฐานข้อมูลและมี migration ครบอย่างน้อย 14; คืน 503 หากยังไม่พร้อม `npm run setup:check` ตรวจเฉพาะความครบของ environment โดยไม่แสดงค่าลับและไม่รับรองสถานะบัญชีผู้ให้บริการ

ก่อน deploy ฟอร์มสมัครพาร์ทเนอร์ที่เลือกยานพาหนะได้หลายประเภท ให้รัน migration `013_partner_rental_categories.sql` ผ่าน `npm run db:migrate` โดยตั้ง `DATABASE_URL` ของ environment ที่ต้องการอัปเดต ฟิลด์ใหม่เก็บประเภทที่เลือกไว้ในใบสมัครและแสดงให้ผู้ตรวจสอบเห็น ใบสมัครเดิมยังใช้งานได้และแสดงว่ายังไม่ระบุประเภท; การส่งใบสมัครใหม่ต้องเลือกอย่างน้อยหนึ่งประเภท

## ทางเข้าทีมงาน

เปิด `/admin` เพื่อเข้าสู่ระบบทีมงานโดยตรง (`/admin?lang=en` และ `/admin?lang=zh` สำหรับภาษาอื่น) หน้านี้ไม่มีการสมัครพาร์ทเนอร์ และตรวจสิทธิ์ `staff_members` ก่อนสร้าง session แอดมินเข้าสู่ภาพรวมธุรกิจ ผู้ตรวจสอบเข้าสู่หน้าตรวจใบสมัคร ส่วน support เข้าหน้างานการชำระเงินตามสิทธิ์เดิม

หน้าทีมงานใช้เมนูหลังบ้านแยกจากหน้าลูกค้า/พาร์ทเนอร์ และออกจากระบบกลับ `/admin` ทางเข้านี้ใช้บัญชีและ session เดิมของ RBC GO; ไม่สร้างบัญชีทีมงานหรือเพิ่มสิทธิ์ให้อัตโนมัติ

## เส้นทางใช้งาน

| งาน | เส้นทางหลังภาษา |
| --- | --- |
| ค้นหายานพาหนะจริง | `/search/boats`, `/search/motorcycles`, `/search/cars`, `/search/jets` |
| รายละเอียดยานพาหนะและขอจอง | `/listing/:id` |
| ข้อมูลลูกค้า | `/account/profile` |
| การจอง ชำระเงิน บันทึก รีวิว ข้อความ | `/account/bookings`, `/account/payments`, `/account/saved`, `/account/reviews`, `/account/messages` |
| รายละเอียดคำขอและชำระเงิน | `/partner-bookings/:id` |
| ใบรับชำระเงินจากรายการที่ยืนยันแล้ว | `/partner-bookings/:id/receipt` |
| ข้อความเกี่ยวกับการจอง | `/messages/:bookingId` |
| อีเมล login/register | `/email`, `/email?mode=register` |
| กู้รหัสผ่านและยืนยันอีเมล | `/account-access` และลิงก์ที่ส่งทางอีเมล |
| สมัคร/เข้าสู่ระบบพาร์ทเนอร์ | `/partner-signup`, `/partner-login` |
| ยื่นเอกสารธุรกิจ | `/apply` |
| รายการและคำขอของพาร์ทเนอร์ | `/partner/overview` |
| วันปิดรับจอง | `/partner/availability` |
| ประวัติรับชำระและ payout ของพาร์ทเนอร์ | `/partner/earnings` |
| ตรวจใบสมัครและยานพาหนะ | `/operations/partners`, `/operations/listings` |
| การจอง คืนเงิน บัญชีรับเงิน และ payout | `/operations/payments` |
| วิธีจอง การยกเลิก ข้อมูล และการติดต่อ | `/help` |

เส้นทางเดิมของทีมงานจะไป workspace จริง ไม่มีการอนุมัติหรือจ่ายเงินจำลองในพื้นที่ที่เปิดเป็นค่าเริ่มต้น

## บัญชีและสิทธิ์

- อีเมล/รหัสผ่านใช้ PostgreSQL, scrypt และ session cookie แบบ HttpOnly; cookie ใช้ Secure ใน production
- ลิงก์ยืนยันอีเมล/ตั้งรหัสผ่านใหม่หมดอายุ 30 นาที ใช้ได้ครั้งเดียว มี cooldown และจำกัดจำนวนคำขอ การตั้งรหัสผ่านใหม่ยกเลิก sessions เดิม
- Google OAuth ตรวจลายเซ็น ID token, issuer, audience, expiry และ nonce ฝั่งเซิร์ฟเวอร์ ต้องตั้ง callback ให้ตรงกับ environment ใน Google Cloud Console ข้อมูลเดิมระบุว่า Google project ยังเป็น Testing; ต้องตรวจ Audience/Publishing ก่อนเปิดให้ลูกค้าทั่วไป
- OTP อีเมลเป็นวิธีหลักแทน SMS: สุ่มรหัส 6 หลัก เก็บเฉพาะ HMAC อายุ 10 นาที ใช้ครั้งเดียว ลองได้ 5 ครั้ง ส่งซ้ำหลัง 60 วินาที สูงสุด 5 ครั้ง/อีเมล/ชั่วโมง, 5 ครั้ง/client/15 นาที และ 100 ครั้งรวม/ชั่วโมง เก็บ challenge ใน cookie แบบ HttpOnly สร้างบัญชีหรือบันทึก email_verified_at หลังรหัสถูกต้องเท่านั้น เบอร์โทรเป็นข้อมูลติดต่อ ไม่เพิ่ม phone_verified_at
- ไม่เชื่อมบัญชี email/Google/phone เข้าด้วยกันโดยอัตโนมัติ
- ผู้ตรวจใบสมัคร/รายการต้องเป็น `reviewer` หรือ `admin`; งานคืนเงิน ผู้รับเงิน และ payout อนุญาตเฉพาะ `admin`
- ผู้ดูแลฐานข้อมูลแต่งตั้ง staff ที่ตรวจสอบแล้วผ่าน `rbc_go.staff_members` ไม่มีปุ่มแต่งตั้งตนเอง
- ข้อความอ่านได้เฉพาะลูกค้าใน booking, สมาชิกพาร์ทเนอร์นั้น และ staff; รีวิวส่งได้ครั้งเดียวโดยเจ้าของ booking ที่ completed แล้ว
- ข้อมูลบัญชีจริงไม่ถูกเก็บใน localStorage เบราว์เซอร์เก็บเฉพาะการตั้งค่าค้นหา/สกุลเงินใน `rbc-go-preferences-v2` เมื่อเปิดเว็บจะล้างข้อมูลเดโมเก่าจาก `rbc-go-next-v1` และไม่กู้บัญชี การจอง รายการบันทึก หรือข้อความจำลองกลับมา

## พาร์ทเนอร์และปฏิทิน

ผู้สมัครยืนยัน OTP อีเมลก่อนสร้างบัญชี ยื่นธุรกิจพร้อม PDF/JPG/PNG จริง ผู้ตรวจอนุมัติธุรกิจก่อนเปิดพื้นที่พาร์ทเนอร์ รายการใหม่และรายการที่แก้ไขตามคำขอต้องผ่านการตรวจอีกครั้ง

เอกสารและรูปเก็บเป็น bytes ใน PostgreSQL พร้อมตรวจประเภทและขนาดไฟล์ เอกสารดาวน์โหลดได้เฉพาะเจ้าของและผู้ตรวจ รูปของรายการที่ไม่เผยแพร่หรือพาร์ทเนอร์ถูกระงับไม่เปิดสาธารณะ การสำรอง PostgreSQL จึงครอบคลุมไฟล์เหล่านี้ด้วย

ปิดวันว่างแยกตามยานพาหนะและใช้ transaction lock ร่วมกับการเสนอราคา ไม่ให้ปิดทับ held/confirmed booking ฐานข้อมูลใช้ exclusion constraint ป้องกันการจองทับกัน บันทึก handover ได้เมื่อเริ่มบริการแล้ว และ complete ได้หลังเวลาสิ้นสุดและบันทึก handover แล้ว

## การจองและชำระเงิน

ลูกค้าส่งวันเวลา → พาร์ทเนอร์เสนอราคาค่าเช่าสุทธิ → ระบบรวมเงินประกันและถือเวลา 48 ชั่วโมง → ลูกค้าตรวจราคาและชำระ → ระบบตรวจ charge จาก Omise ก่อน confirmed

ข้อมูลบัตรส่งตรงให้ Omise ผ่าน hosted payment UI เซิร์ฟเวอร์รับเฉพาะ token ตรวจยอด สกุลเงิน ref_id และ test/live mode ก่อนเปลี่ยนสถานะ มี record สำหรับ payment attempt และ webhook event เพื่อกันการทำซ้ำ การชำระที่ผลไม่แน่นอนถูกล็อกไว้ตรวจสอบ ไม่เปิดให้ชำระซ้ำทันที

ตั้ง `APP_BASE_URL`, `OMISE_PUBLIC_KEY`, `OMISE_SECRET_KEY`, `OMISE_WEBHOOK_SECRET` และ test webhook ที่ `https://YOUR_DOMAIN/api/omise/webhook` เว็บตรวจ HMAC จาก raw body และ timestamp แล้วอ่าน charge กลับจาก Omise อีกครั้ง หน้าสถานะ pending ตรวจผ่าน Server Action แบบ POST และ job ตรวจซ้ำได้

ค่าเริ่มต้น `OMISE_MODE=test` และ `ENABLE_LIVE_PAYMENTS=false` การเปลี่ยนเป็น live ต้องตั้งทั้ง mode/flag, ใช้คู่ live keys และ HTTPS origin; ลูกค้าที่ชำระ live ต้องยืนยันอีเมลหรือโทรศัพท์แล้ว ไม่สลับโหมดให้โดยอัตโนมัติ

## คืนเงินและ payout

- ก่อนเริ่มชำระ ลูกค้ายกเลิกคำขอได้ถ้าไม่มี payment attempt ค้าง
- ชำระแล้วให้ส่งคำขอยกเลิก/คืนเงิน; admin เลือกยอดอนุมัติตามนโยบายธุรกิจ ตรวจไม่ให้เกินยอดที่ยังไม่คืน ก่อนส่ง Refund API จริง
- เมื่อ completed ลูกค้าขอคืนเงินประกันได้ ยอดคืนประเภท deposit ต้องไม่เกินเงินประกันที่เหลือ
- ไม่สร้าง payout จนกว่าบริการ completed, คืนเงินประกันครบ และไม่มี refund ค้าง
- ตั้งอัตราคอมมิชชันในหน้าแอดมิน > ภาพรวมธุรกิจ (เริ่มต้น 10% ตามคำขอ) เก็บใน `business_settings` และบันทึกประวัติการแก้ไขโดย admin อัตราจะถูก snapshot เมื่อเสนอราคา การเปลี่ยนอัตรามีผลกับใบเสนอราคาใหม่เท่านั้น; ไม่ใช้ `PLATFORM_COMMISSION_BPS` แล้ว
- Admin ลงทะเบียน Omise recipient ID ที่ผ่านการตรวจและเปิด active ในโหมดเดียวกับ keys เท่านั้น บัญชี Omise ต้องได้รับสิทธิ์จ่าย third-party recipients ตามเงื่อนไขของผู้ให้บริการ
- Payout กันการส่งซ้ำต่อ booking บันทึกสถานะจาก provider พร้อมค่าธรรมเนียมและยอดรับสุทธิ จะไม่แสดง paid จากการส่งคำขอสำเร็จเพียงอย่างเดียว
- กรณี network timeout ต้องใช้เลขรายการจาก Omise ตรวจเทียบใน workspace ก่อน retry ไม่ถือว่าการ timeout หมายถึงผู้ให้บริการยังไม่ได้ทำรายการ
- การคืนเงินหลังเริ่ม payout ถูกล็อกไว้เพื่อให้ทีมงานตรวจ settlement; ยังไม่มีการหักเงินคืนจากบัญชีพาร์ทเนอร์โดยอัตโนมัติ

คู่มือ API ที่ใช้: [Refunds](https://docs.omise.co/refunds-api), [Transfers](https://docs.omise.co/transfers-api), [Recipients](https://docs.omise.co/recipients-api), [Webhooks](https://docs.omise.co/api-webhooks)

## อีเมล การแจ้งเตือน และ jobs

เลือกผู้ส่งได้ 2 แบบ โดยใช้ adapter เดียวกันสำหรับ OTP ลูกค้า/พาร์ทเนอร์ ลิงก์ยืนยันอีเมล/กู้รหัสผ่าน และการแจ้งเตือน:

- Gmail: ตั้ง `EMAIL_PROVIDER=gmail`, `GMAIL_USER` และ `GMAIL_APP_PASSWORD` ใน `.env.local` หรือ secret store ของ deployment บัญชีต้องเปิดการยืนยันสองขั้นตอนและรองรับ [App Password](https://support.google.com/mail/answer/185833?hl=th) ใช้ App Password 16 ตัวอักษร ไม่ใช้รหัสผ่าน Google ปกติ และห้ามส่งค่า secret ในแชต/commit ลง Git
- `EMAIL_FROM` เว้นว่างได้เมื่อใช้ Gmail ระบบใช้ `RBC GO <GMAIL_USER>` หากกำหนดเอง ที่อยู่ต้องตรงกับ `GMAIL_USER` การส่งใช้ TLS ที่ `smtp.gmail.com:465` ไม่ต้องซื้อโดเมนผู้ส่ง
- Gmail มี [ขีดจำกัดการส่ง](https://support.google.com/mail/answer/22839?hl=th) และอาจถูกระงับการส่งชั่วคราวเมื่อถึงโควตา จึงต้องติดตามปริมาณ OTP และการแจ้งเตือนรวมกัน
- Resend: ตั้ง `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` และ `EMAIL_FROM` จากโดเมนที่ยืนยันแล้ว ยังรองรับ configuration เดิมที่ไม่ได้ระบุ `EMAIL_PROVIDER`

ตั้ง `PARTNER_OTP_SECRET` สุ่มอย่างน้อย 32 ตัวอักษร เป็น HMAC secret ของ OTP ทั้งลูกค้าและพาร์ทเนอร์ (แยก purpose ในข้อมูลที่ hash) OTP ส่งตรงผ่านผู้ส่งที่เลือก ส่วนแจ้งเตือนการจอง ราคา ข้อความ refund และ payout เข้าคิว `rbc_go.email_outbox` ใน transaction เดียวกับข้อมูลธุรกิจ

ตั้ง `APP_BASE_URL` ให้เป็น HTTPS origin ของเว็บจริงก่อนส่งลิงก์กู้รหัสผ่านให้ลูกค้านอกเครื่อง และรัน migration 012 ก่อนเปิด OTP ลูกค้า ตรวจการตั้งค่าด้วย `npm run setup:check` แล้วทดสอบรับ OTP/กู้รหัสผ่านจริงก่อนนับว่าพร้อมใช้งาน

คำขอจากหน้าจอเรียกส่งคิวหลังตอบกลับ และ worker ส่งซ้ำเมื่อบริการขัดข้อง มีการล็อกคิวและ backoff หยุดหลัง 8 attempts เพื่อตรวจแก้การตั้งค่าก่อนส่งใหม่ Resend ใช้ idempotency key ส่วน Gmail SMTP ใช้ Message-ID เดิมเมื่อ retry แต่ SMTP ไม่รับประกัน deduplication หากผู้ส่งยอมรับอีเมลแล้วการตอบกลับสูญหาย ผู้รับอาจได้รับซ้ำ

ตั้ง `JOBS_SECRET` สุ่มอย่างน้อย 32 ตัวอักษร แล้วรัน:

```sh
JOBS_BASE_URL=http://localhost:3000 npm run jobs
```

Worker เรียก POST `/api/jobs/email` และ `/api/jobs/payments` ทุกประมาณ 1 นาที ด้วย Bearer secret; endpoints ปฏิเสธคำขอที่ไม่มี secret ที่ถูกต้อง Docker compose เปิด worker นี้ให้อัตโนมัติ

ไม่ต้องตั้ง Twilio สำหรับ OTP อีเมล หน้าล็อกอินไม่เรียกบริการ SMS แล้ว adapter โทรศัพท์เดิมเก็บไว้เพื่อ compatibility และการทดสอบ ตั้ง `SUPPORT_EMAIL` หากต้องการแสดงช่องทางอีเมลจริงในหน้าช่วยเหลือ

## Deployment

มี `Dockerfile`, `compose.production.yml`, `deploy/Caddyfile` และ `deploy/production.env.example` สำหรับ Node standalone + PostgreSQL + HTTPS reverse proxy + jobs

1. คัดลอก `deploy/production.env.example` เป็น `.env.production` และใส่ค่าจริง ค่ารหัสผ่าน PostgreSQL ใน compose ควรเป็น hex ที่สุ่มใหม่เพื่อใช้ใน URL ได้โดยไม่ต้อง escape
2. ตั้ง DNS ของ `APP_DOMAIN` มาที่โฮสต์ และเปิดพอร์ต 80/443
3. ตรวจ secrets, Google callback, ผู้ส่งอีเมล, recipient และนโยบาย commission ให้ครบ
4. รัน:

```sh
docker compose --env-file .env.production -f compose.production.yml up --build -d
```

Compose ติดตั้ง migration ก่อนเปิดเว็บ ไม่มีการเปิดพอร์ต PostgreSQL ออกสาธารณะ Caddy ขอ TLS certificate ให้โดเมนจริง; ข้อมูลฐานและ TLS อยู่ใน persistent volumes การรันซ้ำหรือ rollback ต้องคง volumes ไว้

CI ใน `.github/workflows/verify.yml` ตรวจ lint, typecheck, build และ integration กับ PostgreSQL แยก ไม่มี auto-deploy production

เปิด indexing ด้วย `ENABLE_PUBLIC_INDEXING=true` หลังตรวจโดเมน ข้อมูลจริง และนโยบายธุรกิจแล้ว คำอธิบายใน `/help` ระบุพฤติกรรมซอฟต์แวร์ปัจจุบัน ไม่ใช่เอกสารข้อกำหนด/นโยบายทางกฎหมายฉบับที่ธุรกิจอนุมัติ

**ข้อจำกัดการตรวจ:** compose config ผ่านการตรวจ แต่ Docker daemon ในเครื่องนี้เริ่มไม่สำเร็จ จึงยังไม่ได้ build/run image จริงหรือทดสอบ TLS บนโดเมนสาธารณะ ต้องตรวจสองส่วนนี้บนโฮสต์ก่อน release

## สำรองและกู้ข้อมูล

ติดตั้ง PostgreSQL client ที่รองรับเวอร์ชันเซิร์ฟเวอร์ แล้วตั้งปลายทางไฟล์สำรอง:

```sh
RBC_GO_BACKUP_DIR=/path/to/private/backups npm run db:backup
```

สคริปต์ใช้ `pg_dump` custom format ไม่ส่งรหัสผ่านผ่าน command line ไฟล์เป็น mode 600 ไดเรกทอรีใหม่เป็น 700 ต้องส่งสำเนาออกไปยังพื้นที่สำรองที่เข้ารหัสแยกจากโฮสต์ และกำหนดรอบสำรอง/อายุจัดเก็บตามธุรกิจ

ตรวจไฟล์ด้วย `pg_restore --list FILE.dump` และทดลองกู้ลงฐานแยกก่อน restore ฐานจริง ห้ามใช้ `--clean` กับฐานใช้งานโดยไม่มีแผนและการยืนยันจากผู้ดูแล ในรอบนี้ทดสอบ dump และ restore ข้อมูลทดสอบลงฐานชั่วคราวสำเร็จ แล้วลบฐานชั่วคราวที่สร้างเอง

## สิ่งที่ยังต้องตั้งค่าจากเจ้าของบริการ

- Gmail ผู้ส่งและ App Password หรือ Resend API key กับอีเมลผู้ส่งจากโดเมนที่ยืนยันแล้ว ไม่ต้องตั้ง Twilio สำหรับการยืนยันด้วยอีเมล
- อัตราคอมมิชชัน นโยบายคืนเงิน/เงินประกัน เอกสารธุรกิจ และบัญชีผู้รับเงินพาร์ทเนอร์ที่ตรวจสอบแล้ว
- โฮสต์/โดเมน/HTTPS และการตั้งค่าบริการให้ตรง production รวมถึง Google Audience/Publishing และ webhook delivery จริง
- การยืนยันตรวจ Docker image และ backup schedule บนโฮสต์จริง

รายละเอียดหลักฐานการตรวจอยู่ใน [QA.md](QA.md)


## เริ่มต้นด้วยข้อมูลจริง

แอปไม่มี seed รถ/พาร์ทเนอร์/การจองสำหรับ production และไม่ใช้ inventory ตัวอย่างเมื่อฐานข้อมูลว่าง หน้าแรกและค้นหาแสดงสถานะว่างจนกว่าจะเพิ่มและอนุมัติรายการจริง โครงสร้างหมวดหมู่และภาพประกอบเว็บไซต์ยังคงอยู่

ข้อมูลรถตัวอย่างที่ใช้ตรวจการคำนวณถูกย้ายไป `tests/fixtures` ซึ่งแอปไม่ import; migrations สร้าง schema โดยไม่เพิ่มข้อมูลธุรกิจจำลอง ข้อมูลและฟีเจอร์ Omise รับชำระ คืนเงิน และ payout ยังคงอยู่ ใช้โหมด test ต่อได้ก่อนตั้งค่ารับเงินจริง

## หลังบ้านธุรกิจและกระเป๋ารายได้พาร์ทเนอร์

ต้องรัน migration `014_business_finance.sql` ก่อนใช้เวอร์ชันนี้ (`npm run db:migrate` ใน environment เป้าหมาย) เพิ่มการตั้งค่าคอมมิชชัน, snapshot ต่อ booking, วันรับชำระและโหมดเงินจริง/ทดสอบ, คำขอถอนเงิน และ view `booking_financials` โดยไม่เพิ่มข้อมูลธุรกิจตัวอย่าง อัตราการจองเก่าที่มี payout จะคงอัตราเดิม ส่วนการจองเก่าอื่นเริ่มที่ 10% ตามนโยบายใหม่นี้ วันรับชำระเก่าที่ไม่เคยบันทึกใช้ `updated_at` ณ migration จึงอาจเป็นวันคืนเงิน/ตรวจรายการล่าสุด ไม่ใช่วันเรียกเก็บเดิม

- `/th/operations/overview`: จำนวนพาร์ทเนอร์ ยอดรับชำระ ส่วนแบ่งบริษัท/พาร์ทเนอร์ แยกบริษัท ช่วงเดือนอิงเวลาไทย และตั้งอัตราคอมมิชชัน
- `/th/operations/partners`: ทะเบียนบริษัทที่อนุมัติ ค้นหา กรองสถานะ จำนวนยานพาหนะ และตรวจใบสมัครเดิม
- `/th/operations/payments`: รายการชำระพร้อมรายละเอียดเงินจริง/เงินทดสอบ คิวถอนเงิน และงานคืนเงิน/ตรวจรายการ/ตั้งบัญชีรับเงินเดิม
- `/th/partner/earnings`: ยอดรอรับ ยอดถอนได้ คำขอถอน ยอดสุทธิเข้าธนาคาร และรายการเฉพาะบริษัทของตน

ทั้งสองฝั่งอ่าน view เดียวกัน นับเฉพาะ payment attempts ที่ gateway ยืนยัน `succeeded/refunded` ไม่รวม pending/failed แยก sandbox ออกจากเงินจริง ค่าคอมคิดจากค่าเช่าหลังคืนเงิน ไม่รวมเงินประกัน ปัดส่วนแบ่งบริษัทลงเป็นสตางค์ ส่วนต่างทั้งหมดเป็นของพาร์ทเนอร์ ยอดบริษัทเป็นรายได้ค่าคอมก่อนหักค่าธรรมเนียมรับชำระ ไม่ใช่กำไรสุทธิทางบัญชี

เจ้าของธุรกิจขอถอนต่อ booking ได้หลัง completed, คืนเงินประกันครบ, ไม่มี refund ค้าง, มี recipient ที่ยืนยันและโหมดตรงกัน ยอดคำนวณฝั่ง server และล็อก booking ร่วมกับ refund/payout ป้องกันคำขอพร้อมกันและถอนซ้ำ คำขอถอนเป็นการสำรองยอด; admin เป็นผู้อนุมัติเรียก Omise Transfer ไม่มีการโอนทันทีเมื่อรับชำระ ค่าธรรมเนียม `total_fee` และยอดสุทธิ `net` ใช้ค่าจาก Omise จริง โอนแล้วเฉพาะเมื่อ `paid=true` ถ้ายอดสุทธิไม่ทราบแสดง —

รองรับ webhook `transfer.create/pay/fail/send/update` โดยตรวจลายเซ็นและอ่าน Transfer กลับจาก Omise ก่อนอัปเดต ใช้ webhook endpoint เดิม และควรคง job `/api/jobs/payments` เพื่อ reconcile กรณีส่ง webhook ไม่สำเร็จ หน้ารายงาน refresh ทุก 30 วินาทีเมื่อไม่ได้พิมพ์ในฟอร์ม
