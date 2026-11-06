"use client";
import { useRBC } from "@/components/rbc/provider";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitPartner, type FormResult } from "@/lib/server/partner-actions";
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
      className="space-y-6 rounded-3xl border bg-card p-6 shadow-sm md:p-8"
    >
      <input type="hidden" name="locale" value={locale} />
      <label className="block text-sm font-semibold">
        {t("Business name")}
        <Input
          name="business"
          defaultValue={businessName}
          required
          minLength={2}
          maxLength={200}
          className="mt-2"
        />
      </label>
      <label className="block text-sm font-semibold">
        {t("Business documents")}
        <Input
          name="documents"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="mt-2 h-auto py-3"
        />
        <span className="mt-2 block text-xs font-normal text-muted-foreground">
          {t("PDF, JPG or PNG, up to 10 MB in total.")}
        </span>
      </label>
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
          {errors[state.error] ??
            t("Unable to submit the application. Please try again.")}
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
