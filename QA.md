# RBC GO — Verification

ตรวจล่าสุดวันที่ 6 พฤศจิกายน 2026 (OTP อีเมลและนำ mock data ออกจากเว็บ)

## ผลตรวจที่ทำแล้ว

- ESLint, TypeScript และ production build ผ่าน หลังแก้การเก็บ state ใน effect และการเรียกเวลาใน render ไม่มีการปิดกฎ lint
- Integration tests ผ่าน 40/40 ไม่ข้ามกรณี ตั้งฐานทดสอบให้ตรง migration ก่อนทดสอบทุกครั้ง
- ทดสอบ PostgreSQL จริง: บัญชี/session, profile แยกบัญชี, ใบสมัคร/เอกสาร, การตรวจและแก้รายการ, รูป public/private และระงับพาร์ทเนอร์
- ทดสอบ booking → quote → payment reconciliation, การป้องกันเวลาทับ และการเข้าถึงข้อมูลของบัญชีอื่น
- ทดสอบ saved listings แยกบัญชี, ข้อความคงอยู่หลังโหลดใหม่, การปฏิเสธผู้ไม่มีสิทธิ์, วันปิดรับจอง, handover/completion และรีวิวหนึ่งครั้งหลัง completed
- ทดสอบ refund/payout: สิทธิ์ admin, ไม่คืนเกินยอด/เงินประกัน, ไม่ส่งคืนเงินหรือ payout ซ้ำ, หัก commission ที่กำหนดชัดเจน, ไม่ย้อน paid จาก event เก่า และ webhook event deduplication
- ทดสอบลิงก์ยืนยันอีเมลและ reset แบบใช้ครั้งเดียว การยกเลิก sessions เก่า รวมถึง OTP อีเมลลูกค้าและพาร์ทเนอร์: รหัสผิด, หมดอายุ, ใช้ซ้ำ, ลองรหัสครบ 5 ครั้ง, จำกัดส่งซ้ำ, ส่งไม่สำเร็จ และป้องกันการเชื่อมบัญชี Google โดยอัตโนมัติ
- ทดสอบ schema ของ Docker compose ผ่าน; ตรวจ Git diff ไม่มี whitespace error

## Omise sandbox จริง

ใช้ test keys ของโครงการและข้อมูลทดสอบเท่านั้น ไม่ใช้ live key ไม่เรียกเก็บหรือโอนเงินจริง:

1. ตรวจ account API สำเร็จ (HTTP 200)
2. สร้าง token ด้วยบัตรทดสอบผ่าน vault API
3. ส่ง charge 500 บาทผ่านฟังก์ชันชำระของแอป ยืนยันสถานะ booking จาก API จริง
4. พยายามชำระ booking เดิมอีกครั้งและถูกป้องกัน
5. ส่งคำขอยกเลิกและคืนเงิน 500 บาทผ่าน Refund API จริง ได้สถานะสำเร็จ
6. ทดสอบ payout 450 บาทจากค่าเช่า 500 บาท โดยใช้อัตรา commission ทดสอบ 1,000 bps เฉพาะ process ทดสอบ ไม่ได้ตั้งอัตราธุรกิจลง environment
7. ใช้ผู้รับเริ่มต้นที่ active/verified ในบัญชี sandbox; ใช้ test-only endpoints ของ Omise เปลี่ยน sent → paid แล้วอ่าน transfer กลับผ่านแอป สถานะ paid ค่าธรรมเนียม และยอดสุทธิบันทึกใน PostgreSQL

ไม่ได้ยืนยันการเปิดสิทธิ์ third-party payouts หรือ bank recipients ของ production บัญชีผู้รับจริงต้องตรวจ/เปิดใช้งานกับผู้ให้บริการก่อนลงทะเบียนในแอป

## การตรวจผ่านเบราว์เซอร์

ใช้ Playwright + Chromium กับ `http://localhost:3102` และฐาน `rbc_go_test` เพราะ Browser plugin ไม่มีในเซสชัน

ตรวจ desktop 1440 × 1000 และ mobile 390 × 844:

- URL/title เป็น RBC GO, หน้าไม่ว่าง ไม่มี framework error overlay และไม่พบ console error
- หน้าแรกแสดงรายการพาร์ทเนอร์จริง ไม่มีรายการหรือ checkout สาธิตเมื่อ `ENABLE_DEMO=false`
- Email login ผ่านฟอร์มจริง → กลับ listing เดิม → ส่งคำขอจอง → ยืนยันในฐานข้อมูลว่าสร้างเพียงรายการเดียว
- พาร์ทเนอร์เข้าด้วย server session → เสนอราคา → ลูกค้าเห็น Awaiting payment และยอดรวมเงินประกัน
- ส่งข้อความ → โหลดใหม่ → ยังพบข้อความเดิม
- บันทึกยานพาหนะ → เปิด Saved items → พบรายการจากฐานข้อมูล
- ปิดวันรับจองจากฟอร์มจริง → พบช่วงเวลาที่บันทึกแล้ว
- ตรวจหน้าจองไทย อังกฤษ และจีนตัวย่อ
- มือถือหน้าบัญชีไม่มี horizontal overflow; ปุ่มและข้อมูลการจองมองเห็นครบ

ภาพหลักฐานอยู่ในไฟล์ชั่วคราวนอก repository เพื่อไม่ให้ปะปนกับซอร์ส ทดสอบเสร็จล้างข้อมูล fixture ของบัญชีและรายการที่สร้างเอง

## สำรองและกู้ข้อมูล

- สร้าง custom-format dump ด้วยสคริปต์ backup จากฐานทดสอบจริง
- ตรวจอ่านด้วย pg_restore สำเร็จ
- กู้ลงฐานชั่วคราว `rbc_go_restore_*_test` สำเร็จ ตรวจ schema/tables/migration แล้วลบเฉพาะฐานชั่วคราวที่สร้างเอง
- ไฟล์ backup ตั้งสิทธิ์ 600; connection password อยู่ใน environment ของ process ไม่อยู่ใน command line

## สิ่งที่ยังตรวจ/เปิดจริงไม่ได้

- อีเมล: ตั้ง Gmail ผู้ส่ง/App Password แล้ว ตรวจ TLS และ SMTP authentication กับ Gmail จริงผ่าน ส่งอีเมลทดสอบผ่าน adapter ของโปรเจกต์กลับเข้าบัญชีผู้ส่งเองสำเร็จ (SMTP accepted) และเจ้าของบัญชียืนยันได้รับจริงแล้ว ยังไม่ได้ทดสอบรับ OTP/verification/reset/notification ทุกชนิดผ่านกล่องจดหมายจริง การทดสอบ business flows ใน integration จำลองเฉพาะขอบเขต provider
- SMS: ผู้ใช้เลือกใช้อีเมลแทนแล้ว หน้าล็อกอินเปลี่ยนเป็น OTP อีเมล ไม่ต้องตั้ง Twilio และไม่ทำเครื่องหมายว่าเบอร์ได้รับการยืนยัน adapter SMS เดิมเก็บไว้สำหรับ compatibility/การทดสอบ
- Google OAuth: โค้ดตรวจ token/state ผ่านการทดสอบ แต่ไม่ได้เข้า Google Cloud Console เพื่อตรวจ Audience/Publishing ของโดเมน production ในรอบนี้
- โฮสต์/โดเมนและ certificate จริงยังไม่มีปลายทางให้ deploy ไม่ได้ทดสอบ public webhook delivery หรือ live payments
- Docker daemon เริ่มไม่สำเร็จ และการอ่าน UI Docker timeout จึงยังไม่ได้ยืนยัน image build/runtime ใน container; standalone server ตรวจแยกในเครื่อง
- ยังไม่ตั้งอัตรา commission จริง นโยบายธุรกิจ เอกสารข้อกำหนด/ความเป็นส่วนตัวที่เจ้าของอนุมัติ หรือบัญชีรับเงินพาร์ทเนอร์จริง
- ไม่ได้ทดสอบทุก browser/OS หรืออุปกรณ์สัมผัสจริง

ใช้ `npm run setup:check` ดู environment ที่ยังขาด และดูขั้นตอนเปิดบริการใน README ก่อน release


## ผลตรวจเพิ่มเติม: OTP อีเมล 6 พฤศจิกายน 2026

- `npm run lint`, `npm run typecheck` และ production build ผ่าน; integration กับ PostgreSQL ทดสอบแยกผ่าน 39/39 ไม่ข้ามกรณี
- `npm audit --omit=dev` ไม่พบช่องโหว่ใน runtime dependencies ณ รอบตรวจนี้
- migration 012 ติดตั้งแล้วทั้งฐานทดสอบและฐานพัฒนา; ลบบัญชี/challenge ทดสอบที่สร้างเพิ่มเองแล้ว
- HTTP QA บน standalone production server `http://localhost:3102/th` ใช้ฐาน `_test` และ provider จำลองเฉพาะที่อยู่ `example.test`: สร้าง cookie challenge แบบ HttpOnly/Secure, ไม่สร้าง session เมื่อรหัสผิด, สร้าง session เมื่อรหัสถูกต้อง, เปิดโปรไฟล์ของบัญชีนั้นได้ และปฏิเสธรหัสที่ใช้แล้ว ไม่มีการส่งอีเมลออกจริง
- Browser plugin ไม่พร้อมใช้งาน ตรวจผ่าน Chrome ด้วย Computer Use: URL/title ตรง, หน้าล็อกอินแสดงช่องอีเมลและปุ่มส่งรหัสภาษาไทย ไม่พบ framework overlay ใน accessibility state แรก การตรวจการกดปุ่มบนหน้าจอหยุดเพราะเครื่องมือแจ้งว่า Chrome ถูกผู้ใช้เปลี่ยนระหว่างทำงาน จึงยังไม่ยืนยัน interaction, console, screenshot หรือ mobile ของหน้าที่ปรับในรอบนี้
- `setup:check` ผ่านค่าผู้ส่งอีเมลทั้งหมดและไม่เรียกร้อง Twilio แล้ว; ค่าที่ยังขาดคือ commission ซึ่งเป็นนโยบายธุรกิจคนละส่วนกับอีเมล APP_BASE_URL ยังเป็น localhost ต้องตั้ง HTTPS origin จริงก่อนใช้ลิงก์กู้รหัสผ่านจากนอกเครื่อง

- ตรวจการเชื่อมต่อผู้ส่งจริงเพิ่มเติม: Gmail TLS port 465 และ authentication ผ่าน ส่งอีเมลทดสอบ 1 ฉบับเข้าบัญชีผู้ส่งเองผ่าน `sendTransactionalEmail` ได้รับ SMTP accepted; ไม่ได้พิมพ์ secret หรือเพิ่มผู้รับอื่น เจ้าของบัญชียืนยันได้รับอีเมลจริงในแชตแล้ว
- เว็บพัฒนาที่ `http://localhost:3000`: `/api/health` และ `/th` ตอบ HTTP 200; server-rendered props ระบุ `emailOtpEnabled=true` หลังบันทึกค่าผู้ส่งใหม่ ไม่พบ error document ในผลตอบกลับ


## นำ mock data ออกจากเว็บ

- ย้ายรถตัวอย่าง 7 รายการจาก `src/lib/inventory.json` ไป `tests/fixtures` แอปเก็บเพียงหมวดหมู่ใน `src/lib/categories.json` และใช้รายการที่อนุมัติจาก PostgreSQL
- หน้าแรก/ค้นหาไม่มี fallback ไปยังตัวอย่างรถ รีวิว หรือราคาเดโม ตัดการนำเข้าหน้าเดโมออกจาก router และไม่ใช้ `ENABLE_DEMO` ใน runtime อีก แม้ deployment เก่าจะตั้งเป็น true
- ล้าง seed วันปิดรับจองและวันที่ค้นหาตัวอย่าง เปลี่ยน browser storage เป็น preferences v2 ซึ่งเก็บเฉพาะ search/currency; อ่าน v1 เพื่อย้าย preferences แล้วลบข้อมูลเดโมเก่า ไม่กู้บัญชี การจอง ข้อความ และรายการบันทึกจำลองกลับมา
- ตรวจฐานพัฒนาแบบ read-only: รถ/พาร์ทเนอร์/ใบสมัคร/การจอง/การรับชำระ/การคืนเงิน/payout/ข้อความ/รีวิว/รายการบันทึกเป็น 0 ไม่พบบัญชีทดสอบที่รู้จัก มีบัญชีผู้ใช้ 2 บัญชีและ sessions เดิมซึ่งคงไว้ ไม่มีการล้างฐานหรือแก้ข้อมูลผู้ใช้จริง
- คงโค้ด Omise, การรับชำระ, คืนเงิน และ payout ตามที่ผู้ใช้ยืนยัน ไม่เปิด live payments และไม่เรียกเก็บเงินจริงในรอบนี้
- ESLint, TypeScript และ production build ผ่าน ชุดทดสอบปัจจุบันผ่าน 40/40 ไม่ข้ามกรณี รวมการปฏิเสธข้อมูลเดโมจาก storage, authorization, booking/payment/refund/payout และการแสดงเฉพาะรายการอนุมัติ ทดสอบเส้นทางเดโมโดยตั้ง ENABLE_DEMO=true เฉพาะ process ทดสอบเพื่อยืนยันว่าเปิดกลับไม่ได้
- HTTP QA ที่ `http://localhost:3000`: หน้าแรกและหน้าค้นหาทั้ง 4 หมวดตอบ 200 พร้อม empty state; vehicle/azimut, checkout/mercedes, experiences และ guide แสดงหน้า not-found ไม่มีข้อมูลตัวอย่าง (Next.js อาจส่ง HTTP 200 เมื่อ streaming เริ่มแล้ว จึงตรวจเนื้อหา 404 และ not-found ร่วมด้วย)
- การตรวจรอบนี้ยืนยันผลตอบกลับ HTTP และพฤติกรรม storage ผ่าน tests ยังไม่ได้ตรวจภาพหน้าจอ console หรือ interaction บนมือถือใหม่
