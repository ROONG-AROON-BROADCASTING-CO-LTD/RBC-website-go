import { createHash } from "node:crypto";
import { getDb } from "./db";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected";

export type PartnerApplication = {
  id: string;
  owner_account_id: string;
  business_name: string;
  status: ApplicationStatus;
  feedback: string | null;
  submitted_at: Date | null;
  reviewed_at: Date | null;
};

export class PartnerApplicationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "PartnerApplicationError";
  }
}

export async function getPartnerApplication(accountId: string) {
  const sql = getDb();
  const [application] = await sql<PartnerApplication[]>`
    select id, owner_account_id, business_name, status, feedback,
           submitted_at, reviewed_at
    from rbc_go.partner_applications
    where owner_account_id = ${accountId}
  `;
  return application ?? null;
}

export async function getPartnerDocuments(accountId: string) {
  const sql = getDb();
  return sql<{ id: string; file_name: string; uploaded_at: Date }[]>`
    select documents.id, documents.file_name, documents.uploaded_at
    from rbc_go.partner_documents documents
    join rbc_go.partner_applications applications
      on applications.id = documents.application_id
    where applications.owner_account_id = ${accountId}
    order by documents.uploaded_at desc
  `;
}

export async function savePartnerDraft(
  accountId: string,
  businessName: string,
) {
  const name = businessName.trim();
  if (name.length < 2 || name.length > 200) {
    throw new PartnerApplicationError("invalid_business_name");
  }

  const sql = getDb();
  const [application] = await sql<PartnerApplication[]>`
    insert into rbc_go.partner_applications as application
      (owner_account_id, business_name)
    values (${accountId}, ${name})
    on conflict (owner_account_id) do update
      set business_name = excluded.business_name,
          updated_at = now()
      where application.status in ('draft', 'changes_requested')
    returning id, owner_account_id, business_name, status, feedback,
              submitted_at, reviewed_at
  `;
  if (!application) {
    throw new PartnerApplicationError("application_locked");
  }
  return application;
}

function verifiedFile(fileName: string, mimeType: string, bytes: Uint8Array) {
  const name = fileName.split(/[\\/]/).pop()?.trim() ?? "";
  if (!name || name.length > 200 || /[\x00-\x1f\x7f]/.test(name)) {
    throw new PartnerApplicationError("invalid_file_name");
  }
  if (bytes.length < 1 || bytes.length > 10 * 1024 * 1024) {
    throw new PartnerApplicationError("invalid_file_size");
  }
  const content = Buffer.from(bytes);
  const pdf = content.subarray(0, 5).equals(Buffer.from("%PDF-"));
  const png = content
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = content[0] === 0xff && content[1] === 0xd8;
  if (!(
    (mimeType === "application/pdf" && pdf) ||
    (mimeType === "image/png" && png) ||
    (mimeType === "image/jpeg" && jpeg)
  )) {
    throw new PartnerApplicationError("invalid_file_type");
  }
  return {
    name,
    content,
    sha256: createHash("sha256").update(content).digest(),
  };
}

export async function addPartnerDocument(
  accountId: string,
  fileName: string,
  mimeType: string,
  bytes: Uint8Array,
) {
  const file = verifiedFile(fileName, mimeType, bytes);
  const sql = getDb();
  return sql.begin(async (tx) => {
    const [application] = await tx<{ id: string; status: ApplicationStatus }[]>`
      select id, status from rbc_go.partner_applications
      where owner_account_id = ${accountId} for update
    `;
    if (!application) {
      throw new PartnerApplicationError("application_missing");
    }
    if (!["draft", "changes_requested"].includes(application.status)) {
      throw new PartnerApplicationError("application_locked");
    }
    const [existing] = await tx<{ id: string; file_name: string }[]>`
      select id, file_name from rbc_go.partner_documents
      where application_id = ${application.id} and sha256 = ${file.sha256}
      limit 1
    `;
    if (existing) return existing;
    const [usage] = await tx<{ count: number; bytes: number }[]>`
      select count(*)::integer as count, coalesce(sum(byte_size), 0)::integer as bytes
      from rbc_go.partner_documents where application_id = ${application.id}
    `;
    if (
      usage.count >= 10 ||
      usage.bytes + file.content.length > 20 * 1024 * 1024
    ) {
      throw new PartnerApplicationError("document_limit");
    }
    const [document] = await tx<{ id: string; file_name: string }[]>`
      insert into rbc_go.partner_documents
        (application_id, file_name, mime_type, byte_size, sha256, content)
      values
        (${application.id}, ${file.name}, ${mimeType},
         ${file.content.length}, ${file.sha256}, ${file.content})
      returning id, file_name
    `;
    return document;
  });
}

export async function submitPartnerApplication(accountId: string) {
  const sql = getDb();
  return sql.begin(async (tx) => {
    const [application] = await tx<{ id: string; status: ApplicationStatus }[]>`
      select id, status from rbc_go.partner_applications
      where owner_account_id = ${accountId} for update
    `;
    if (!application) {
      throw new PartnerApplicationError("application_missing");
    }
    if (!["draft", "changes_requested"].includes(application.status)) {
      throw new PartnerApplicationError("application_locked");
    }
    const [documents] = await tx<{ count: number }[]>`
      select count(*)::integer as count from rbc_go.partner_documents
      where application_id = ${application.id}
    `;
    if (!documents.count) {
      throw new PartnerApplicationError("documents_required");
    }
    const [updated] = await tx<PartnerApplication[]>`
      update rbc_go.partner_applications
      set status = 'submitted', submitted_at = now(),
          feedback = null, updated_at = now()
      where id = ${application.id}
      returning id, owner_account_id, business_name, status, feedback,
                submitted_at, reviewed_at
    `;
    return updated;
  });
}

export async function reviewPartnerApplication(
  reviewerAccountId: string,
  applicationId: string,
  decision: "approved" | "changes_requested" | "rejected",
  feedback = "",
) {
  if (feedback.length > 2000 || (decision !== "approved" && !feedback.trim())) {
    throw new PartnerApplicationError("feedback_required");
  }
  const sql = getDb();
  return sql.begin(async (tx) => {
    const [staff] = await tx<{ role: string }[]>`
      select role from rbc_go.staff_members
      where account_id = ${reviewerAccountId}
        and role in ('admin', 'reviewer')
    `;
    if (!staff) throw new PartnerApplicationError("forbidden");

    const [application] = await tx<PartnerApplication[]>`
      select id, owner_account_id, business_name, status, feedback,
             submitted_at, reviewed_at
      from rbc_go.partner_applications
      where id = ${applicationId} for update
    `;
    if (
      !application ||
      !["submitted", "under_review"].includes(application.status)
    ) {
      throw new PartnerApplicationError("application_locked");
    }

    const [updated] = await tx<PartnerApplication[]>`
      update rbc_go.partner_applications
      set status = ${decision}, feedback = ${feedback.trim() || null},
          reviewed_at = now(), reviewed_by = ${reviewerAccountId},
          updated_at = now()
      where id = ${application.id}
      returning id, owner_account_id, business_name, status, feedback,
                submitted_at, reviewed_at
    `;

    if (decision === "approved") {
      const [partner] = await tx<{ id: string }[]>`
        insert into rbc_go.partners
          (application_id, owner_account_id, business_name)
        values
          (${application.id}, ${application.owner_account_id},
           ${application.business_name})
        returning id
      `;
      await tx`
        insert into rbc_go.partner_members (partner_id, account_id, role)
        values (${partner.id}, ${application.owner_account_id}, 'owner')
      `;
    }
    return updated;
  });
}
