"use client";
import { useRBC } from "@/components/rbc/provider";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { submitPartner, type FormResult } from "@/lib/server/partner-actions";
import { PartnerDocumentGuidance } from "./document-guidance";
const initial: FormResult = { error: "" };
const errors: Record<string, string> = {
  invalid_business_name: "Enter a business name of 2\u2013200 characters.",
  documents_required: "Attach at least one document.",
  too_many_documents: "Attach up to 5 files at a time.",
  invalid_file_size: "Each file must be 10 MB or smaller.",
  total_file_size: "Total file size must not exceed 10 MB.",
  document_limit: "This application has reached its document limit.",
  invalid_file_type: "Only PDF, JPG and PNG are supported.",
  invalid_file_name: "Invalid file name.",
  application_locked: "This application is already under review.",
  sign_in_required: "Please sign in again.",
};
export function PartnerApplicationForm({
  locale,
  businessName,
  documents,
}: {
  locale: string;
  businessName: string;
  documents: {
    id: string;
    file_name: string;
  }[];
}) {
  const { t } = useRBC();
  const [state, action, pending] = useActionState(submitPartner, initial);
  return (
    <form
      action={action}
      className="flex flex-col gap-6 rounded-3xl border bg-card p-6 shadow-sm md:p-8"
    >
      <input type="hidden" name="locale" value={locale} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="partner-business">
            {t("Business name / owner's full name")}
          </FieldLabel>
          <Input
            id="partner-business"
            name="business"
            defaultValue={businessName}
            required
            minLength={2}
            maxLength={200}
            aria-describedby="partner-business-help"
          />
          <FieldDescription id="partner-business-help">
            {t(
              "For an individual owner, enter your full name. For a business, enter the registered name shown in your documents.",
            )}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="partner-documents">
            {t("Applicant and vehicle documents")}
          </FieldLabel>
          <PartnerDocumentGuidance t={t} />
          <Input
            id="partner-documents"
            name="documents"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            aria-describedby="partner-documents-help partner-documents-limits"
            className="h-auto py-3"
          />
          <FieldDescription id="partner-documents-limits">
            {t(
              "Attach up to 5 files at a time. PDF, JPG or PNG, up to 10 MB in total.",
            )}
          </FieldDescription>
        </Field>
      </FieldGroup>
      {documents.length > 0 && (
        <div className="rounded-2xl bg-secondary/50 p-4">
          <p className="mb-2 text-sm font-semibold">
            {t("Uploaded documents")}
          </p>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {documents.map((document) => (
              <li key={document.id}>{document.file_name}</li>
            ))}
          </ul>
        </div>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t(
            errors[state.error] ??
              "Unable to submit the application. Please try again.",
          )}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending
          ? t("Submitting application...")
          : t("Submit application for review")}
      </Button>
    </form>
  );
}
