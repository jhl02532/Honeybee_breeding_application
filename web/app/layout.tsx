import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MelittaBreed Web Center",
  description: "PhD Beekeeping Breeding Research Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, background: "#121212", color: "#f3f4f6" }}>
        {children}
      </body>
    </html>
  );
}
