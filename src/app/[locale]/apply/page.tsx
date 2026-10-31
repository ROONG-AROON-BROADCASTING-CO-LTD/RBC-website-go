import { redirect } from "next/navigation";
import { PartnerApplicationForm } from "@/components/partner/application-form";
import { currentAccount } from "@/lib/server/auth";
import { logoutPartner } from "@/lib/server/partner-actions";
import {
  getPartnerApplication,
  getPartnerDocuments,
} from "@/lib/server/partner-application";
import { getActivePartner } from "@/lib/server/listings";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!process.env.DATABASE_URL) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-3xl font-bold">ยังไม่ได้ตั้งค่าฐานข้อมูล</h1>
        <p className="mt-3 text-muted-foreground">
          ตั้งค่า DATABASE_URL และรัน migration ก่อนเปิดรับสมัครพาร์ทเนอร์
        </p>
      </main>
    );
  }
  const account = await currentAccount();
  if (!account) redirect(`/${locale}/partner-login`);
  const [application, documents] = await Promise.all([
    getPartnerApplication(account.id),
    getPartnerDocuments(account.id),
  ]);
  if (application?.status === "approved") {
    const partner = await getActivePartner(account.id);
    if (partner) redirect(`/${locale}/partner/overview`);
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-3xl font-bold">บัญชีพาร์ทเนอร์ไม่พร้อมใช้งาน</h1>
        <p className="mt-3 text-muted-foreground">
          กรุณาติดต่อทีมงานเพื่อตรวจสอบสถานะบัญชีพาร์ทเนอร์
        </p>
      </main>
    );
  }
  const editable =
    !application ||
    application.status === "draft" ||
    application.status === "changes_requested";
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-16">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-widest text-primary">
            RBC GO PARTNERS
          </p>
          <h1 className="mt-2 text-3xl font-bold">ยืนยันข้อมูลพาร์ทเนอร์</h1>
          <p className="mt-2 text-muted-foreground">
            ส่งข้อมูลธุรกิจและเอกสาร ทีมงานจะตรวจสอบก่อนเปิดหน้าจัดการพาร์ทเนอร์
          </p>
        </div>
        <form action={logoutPartner}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="text-sm font-semibold text-primary hover:underline"
          >
            ออกจากระบบ
          </button>
        </form>
      </div>
      <ol className="mb-7 grid gap-3 text-sm sm:grid-cols-3">
        <li className="rounded-2xl border bg-card p-4 font-semibold">
          1. สร้างบัญชี ✓
        </li>
        <li className="rounded-2xl border bg-card p-4 font-semibold">
          2. ส่งเอกสาร {editable ? "←" : "✓"}
        </li>
        <li className="rounded-2xl border bg-card p-4 font-semibold">
          3. รอผลการตรวจสอบ
        </li>
      </ol>
      {editable ? (
        <PartnerApplicationForm
          locale={locale}
          businessName={application?.business_name ?? ""}
          documents={documents}
        />
      ) : (
        <div className="rounded-3xl border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-bold">
            {application.status === "rejected"
              ? "ใบสมัครไม่ผ่านการตรวจสอบ"
              : "ส่งใบสมัครแล้ว"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {application.status === "rejected"
              ? "กรุณาติดต่อทีมงานหากต้องการข้อมูลเพิ่มเติม"
              : "ทีมงานกำลังตรวจสอบข้อมูลและเอกสารของคุณ"}
          </p>
          {application.feedback && (
            <p className="mt-4 rounded-2xl bg-secondary p-4">
              {application.feedback}
            </p>
          )}
        </div>
      )}
      {application?.status === "changes_requested" && application.feedback && (
        <p className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          ต้องแก้ไขข้อมูล: {application.feedback}
        </p>
      )}
    </main>
  );
}
