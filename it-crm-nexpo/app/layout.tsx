import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXPO IT CRM",
  description: "Simple IT CRM application",
};

// Glavni layout aplikacije.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}