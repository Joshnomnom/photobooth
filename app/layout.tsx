import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "The Snap Room — Browser Photo Booth", description: "A private, playful photo booth that lives right in your browser." };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
