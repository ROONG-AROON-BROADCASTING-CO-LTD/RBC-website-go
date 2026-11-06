import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-thai";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "RBC GO · Your journey. By road, sea, or sky.",
    template: "%s · RBC GO",
  },
  description:
    "ค้นหาและส่งคำขอจองรถ เรือยอชต์ และเครื่องบินส่วนตัวจากพาร์ทเนอร์ RBC GO",
  robots: {
    index: process.env.ENABLE_PUBLIC_INDEXING === "true",
    follow: process.env.ENABLE_PUBLIC_INDEXING === "true",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="antialiased">
      <body>{children}</body>
    </html>
  );
}
