import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "K-BEE BANK Web Center",
  description: "PhD Beekeeping Breeding Research Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
