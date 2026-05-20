import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asset Correlation Monitor",
  description: "Cross-asset correlation and anomaly detection",
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
