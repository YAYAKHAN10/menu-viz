import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono } from "next/font/google";
import ReactGrab from "@/components/ReactGrab";
import "./globals.css";

// DM Sans is the workhorse / display face (whisper-weight headlines); Geist is
// kept for UI labels and tabular numbers. See DESIGN.md / the Dimension system.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MenuViz",
  description:
    "Interactive restaurant menus with 360 degree food previews and AR table viewing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        {process.env.NODE_ENV === "development" && <ReactGrab />}
      </body>
    </html>
  );
}
