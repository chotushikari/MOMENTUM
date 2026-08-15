import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MOMENTUM — Short-Form Intelligence",
    template: "%s | MOMENTUM",
  },
  description:
    "Find what has momentum. Any category. Any niche. Anywhere. Discover what's moving on YouTube Shorts, understand why, and find your next creator opportunity.",
  keywords: ["YouTube Shorts", "viral trends", "creator intelligence", "short-form video", "content strategy"],
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
