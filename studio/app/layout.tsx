import type { Metadata } from "next";
import "./globals.css";
import { APP_VERSION } from "../lib/version";

export const metadata: Metadata = {
  title: `Blockcraft ${APP_VERSION} · 마인크래프트 3D 설계도`,
  description: "블록으로 설계하고, 층별로 건축하고, 친구와 공유하세요.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/blockcraft.svg",
    shortcut: "/blockcraft.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
