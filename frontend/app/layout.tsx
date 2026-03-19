import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/**
 * Load the Inter font from Google Fonts.
 * Inter is a clean, modern sans-serif that matches
 * the Linear/Notion-inspired design aesthetic.
 */
const inter = Inter({ subsets: ["latin"] });

/**
 * Application-level metadata displayed in browser tabs and search results.
 * Sets the app title and description for SEO and user clarity.
 */
export const metadata: Metadata = {
  title: "usmleAI — USMLE Study Platform",
  description: "AI-powered USMLE question bank and study platform",
};

/**
 * Root layout component that wraps every page in the application.
 * Provides the HTML structure, font, and global styles.
 *
 * @param children - The page content rendered inside the layout
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* antialiased smooths font rendering across browsers */}
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
