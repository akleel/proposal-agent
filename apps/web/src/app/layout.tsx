import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proposal Agent",
  description:
    "Production-minded proposal automation from messy customer inquiry to review-ready draft.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <aside className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-center text-sm text-amber-950">
          Portfolio demo — use fictional data only. Do not enter real or confidential customer
          information.
        </aside>
        {children}
      </body>
    </html>
  );
}
