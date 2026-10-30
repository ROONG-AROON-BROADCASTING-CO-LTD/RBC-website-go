import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20">
      <p className="mb-3 text-sm text-muted-foreground">404 · RBC GO</p>
      <h1 className="mb-8 text-3xl font-semibold">
        ไม่พบหน้านี้ / Page not found
      </h1>
      <Link
        href="/th"
        className="rounded-xl bg-primary px-6 py-3 text-primary-foreground"
      >
        กลับหน้าหลัก / Back home
      </Link>
    </div>
  );
}
