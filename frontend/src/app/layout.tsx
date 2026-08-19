import type { Metadata } from "next";
import "./globals.css";

// NOTE: no next/font/google here on purpose — a live fetch to Google Fonts
// at build time isn't reproducible in offline/CI environments. Typography
// is a decision for the dedicated UI/UX sprint, not the scaffold.

export const metadata: Metadata = {
  title: "OmniClause",
  description: "AI-powered legal clause compliance & risk analysis platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
