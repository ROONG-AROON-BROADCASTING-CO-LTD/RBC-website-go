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
    "ค้นหาและจองรถ เรือยอชต์ และเครื่องบินส่วนตัวกับ RBC GO · Travel marketplace demo",
  robots: { index: false, follow: false },
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
