import type { Metadata, Viewport } from "next";
import { body, display } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Snap Room — Browser Photo Booth",
  description: "A private photo booth that runs entirely in your browser. Nothing is uploaded.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f4efe7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
