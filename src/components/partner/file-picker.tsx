"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileText, Images, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRBC } from "@/components/rbc/provider";

type FilePickerProps = {
  id: string;
  label: string;
  kind: "photos" | "documents";
  files: string[];
  onFilesChange: (names: string[]) => void;
  children?: ReactNode;
};

function supported(file: File, kind: FilePickerProps["kind"]) {
  if (kind === "photos")
    return (
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|avif|heic)$/i.test(file.name)
    );
  return /\.(pdf|png|jpe?g)$/i.test(file.name);
}

export function FilePicker({
  id,
  label,
  kind,
  files,
  onFilesChange,
  children,
}: FilePickerProps) {
  const { t } = useRBC();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<Record<string, string>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const isPhoto = kind === "photos";

  useEffect(() => {
    return () =>
      Object.values(previewsRef.current).forEach(URL.revokeObjectURL);
  }, []);

  function addFiles(incoming: File[]) {
    const valid = incoming.filter((file) => supported(file, kind));
    setError(valid.length === incoming.length ? "" : "Unsupported file type");
    if (!valid.length) return;

    if (isPhoto) {
      const next = { ...previewsRef.current };
      for (const file of valid) {
        if (next[file.name]) URL.revokeObjectURL(next[file.name]);
        next[file.name] = URL.createObjectURL(file);
      }
      previewsRef.current = next;
      setPreviews(next);
    }
    onFilesChange([...new Set([...files, ...valid.map((file) => file.name)])]);
  }

  function removeFile(name: string) {
    if (previewsRef.current[name]) {
      URL.revokeObjectURL(previewsRef.current[name]);
      const next = { ...previewsRef.current };
      delete next[name];
      previewsRef.current = next;
      setPreviews(next);
    }
    onFilesChange(files.filter((file) => file !== name));
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{t(label)}</FieldLabel>
      <div
        className={cn(
          "rounded-2xl border-2 border-dashed border-border bg-secondary/30 px-5 py-7 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "hover:border-primary/40 hover:bg-secondary/50",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {isPhoto ? (
            <Images className="size-6" />
          ) : (
            <UploadCloud className="size-6" />
          )}
        </span>
        <p className="mt-3 font-semibold text-foreground">
          {t(isPhoto ? "Choose photos" : "Choose documents")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            isPhoto
              ? "Drop photos here or browse files"
              : "Drop documents here or browse files",
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 rounded-full bg-card"
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud data-icon="inline-start" />
          {t("Browse files")}
        </Button>
        <Input
          ref={inputRef}
          id={id}
          type="file"
          accept={isPhoto ? "image/*" : ".pdf,.jpg,.jpeg,.png"}
          multiple
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => {
            addFiles(Array.from(event.currentTarget.files || []));
            event.currentTarget.value = "";
          }}
        />
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        {t(isPhoto ? "Image files" : "PDF, JPG or PNG files")}
        {" · "}
        {t("Upload names only; files are not sent to a server.")}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(error)}
        </p>
      )}
      {children}
      {files.length > 0 && (
        <div className="mt-1">
          <p aria-live="polite" className="mb-3 text-sm font-semibold">
            {t("Selected files")} ({files.length})
          </p>
          <div
            className={cn(
              "grid gap-3",
              isPhoto && "grid-cols-2 sm:grid-cols-3",
            )}
          >
            {files.map((name) => (
              <div
                key={name}
                className={cn(
                  "relative min-w-0 overflow-hidden rounded-xl border bg-card",
                  isPhoto ? "shadow-sm" : "flex items-center gap-3 p-3",
                )}
              >
                {isPhoto ? (
                  previews[name] ? (
                    <div
                      role="img"
                      aria-label={name}
                      className="aspect-[4/3] bg-secondary bg-cover bg-center"
                      style={{ backgroundImage: `url(${previews[name]})` }}
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-secondary text-primary">
                      <Images className="size-8" />
                    </div>
                  )
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-5" />
                  </span>
                )}
                <p
                  title={name}
                  className={cn(
                    "min-w-0 truncate text-sm font-medium",
                    isPhoto ? "py-2 pl-3 pr-9" : "flex-1 pr-8",
                  )}
                >
                  {name}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${t("Remove file")}: ${name}`}
                  className={cn(
                    "absolute right-1.5 rounded-full hover:bg-destructive/10 hover:text-destructive",
                    isPhoto
                      ? "top-1.5 bg-card/90 shadow-sm"
                      : "top-1/2 -translate-y-1/2",
                  )}
                  onClick={() => removeFile(name)}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Field>
  );
}
