"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-20">
      <h1 className="mb-5 text-2xl font-semibold">
        โหลดหน้านี้ไม่สำเร็จ / Unable to load this page
      </h1>
      <button
        onClick={reset}
        className="rounded-xl bg-primary px-6 py-3 text-primary-foreground"
      >
        ลองใหม่ / Try again
      </button>
    </div>
  );
}
