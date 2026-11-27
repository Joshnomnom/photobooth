import { Fraunces, Inter } from "next/font/google";

export const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const body = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
