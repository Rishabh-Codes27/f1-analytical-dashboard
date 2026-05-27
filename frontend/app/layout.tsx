import type { Metadata } from "next";
import { Orbitron, Space_Grotesk } from "next/font/google";

import { Providers } from "@/app/providers";
import "./globals.css";

const displayFont = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "F1 Analytics Dashboard",
  description: "Interactive Formula 1 telemetry replay and analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
