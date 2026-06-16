import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memory Fields",
  description: "Collaborative audio visualization rooms.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-deep text-frost antialiased">{children}</body>
    </html>
  );
}
