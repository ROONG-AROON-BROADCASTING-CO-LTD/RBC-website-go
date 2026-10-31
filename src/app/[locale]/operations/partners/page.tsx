import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentAccount } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { reviewApplication } from "./actions";

type ApplicationRow = {
  id: string;
  business_name: string;
  status: string;
  feedback: string | null;
  submitted_at: Date | null;
  display_name: string;
  email: string | null;
};

export default async function PartnerReviews({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  if (!process.env.DATABASE_URL) notFound();
  const account = await currentAccount();
  if (!account) redirect(`/${locale}/partner-login`);
  const sql = getDb();
  const [staff] = await sql<{ role: string }[]>`
    select role from rbc_go.staff_members where account_id = ${account.id}
      and role in ('admin', 'reviewer')
  `;
  if (!staff) notFound();
  const applications = await sql<ApplicationRow[]>`
    select applications.id, applications.business_name, applications.status,
           applications.feedback, applications.submitted_at,
           accounts.display_name, accounts.email
    from rbc_go.partner_applications applications
    join rbc_go.accounts accounts on accounts.id = applications.owner_account_id
    where applications.status in ('submitted', 'under_review')
    order by applications.submitted_at asc
  `;
  const documentRows = await sql<
    { application_id: string; id: string; file_name: string }[]
  >`
    select documents.application_id, documents.id, documents.file_name
    from rbc_go.partner_documents documents
    join rbc_go.partner_applications applications on applications.id = documents.application_id
    where applications.status in ('submitted', 'under_review')
    order by documents.uploaded_at asc
  `;
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <p className="text-sm font-bold tracking-widest text-primary">
        RBC GO OPERATIONS
      </p>
      <h1 className="mt-2 text-3xl font-bold">ตรวจใบสมัครพาร์ทเนอร์</h1>
      <nav className="mt-4 flex gap-4 text-sm font-semibold">
        <span>ใบสมัครพาร์ทเนอร์</span>
        <Link
          href={`/${locale}/operations/listings`}
          className="text-primary hover:underline"
        >
          รายการยานพาหนะ
        </Link>
      </nav>
      <p className="mt-2 text-muted-foreground">
        {applications.length} รายการรอตรวจสอบ
      </p>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-destructive/10 p-4 text-destructive"
        >
          ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลและลองอีกครั้ง
        </p>
      )}
      <div className="mt-7 space-y-5">
        {applications.map((application) => (
          <section
            key={application.id}
            className="rounded-3xl border bg-card p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  {application.business_name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {application.display_name} · {application.email}
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
                {application.status}
              </span>
            </div>
            <div className="mt-5">
              <p className="text-sm font-semibold">เอกสาร</p>
              <ul className="mt-2 space-y-2 text-sm">
                {documentRows
                  .filter(
                    (document) => document.application_id === application.id,
                  )
                  .map((document) => (
                    <li key={document.id}>
                      <a
                        className="text-primary underline"
                        href={`/api/partner-documents/${document.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {document.file_name}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
            <form
              action={reviewApplication}
              className="mt-6 space-y-3 border-t pt-5"
            >
              <input type="hidden" name="locale" value={locale} />
              <input
                type="hidden"
                name="applicationId"
                value={application.id}
              />
              <label className="block text-sm font-semibold">
                หมายเหตุถึงผู้สมัคร
                <textarea
                  name="feedback"
                  rows={3}
                  maxLength={2000}
                  className="mt-2 w-full rounded-xl border bg-background p-3 text-sm"
                  placeholder="กรอกเหตุผลเมื่อขอแก้ไขหรือปฏิเสธ"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  name="decision"
                  value="approved"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  อนุมัติ
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="changes_requested"
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  ขอเอกสารเพิ่ม
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="rejected"
                  className="rounded-xl border border-destructive px-4 py-2 text-sm font-semibold text-destructive"
                >
                  ปฏิเสธ
                </button>
              </div>
            </form>
          </section>
        ))}
        {applications.length === 0 && (
          <p className="rounded-3xl border bg-card p-8 text-center text-muted-foreground">
            ไม่มีใบสมัครรอตรวจสอบ
          </p>
        )}
      </div>
    </main>
  );
}
