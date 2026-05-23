import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Facebook Assistant",
  description:
    "A persistent AI agent platform accessible through Facebook Messenger with multimodal intelligence, tool usage, long-term memory, and personalized assistant capabilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}