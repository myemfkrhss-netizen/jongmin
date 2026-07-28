import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "세특킷 · 학생부 기록 도우미",
  description: "학생 활동 키워드로 세부능력 및 특기사항 초안을 만드는 기록 도우미",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
