import type { Metadata, Viewport } from "next";
import { OfflineBanner } from "@/components/OfflineBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cardinal OS Markets",
  description: "A self-serve business operating system for Nigerian traders.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1A4A8B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
