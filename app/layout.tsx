import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cardinal OS Markets",
  description: "A self-serve business operating system for Nigerian traders.",
};

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
