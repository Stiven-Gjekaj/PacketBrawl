import type { Metadata } from "next";
import { Cinzel, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// A terminal face against a Roman inscription serif. The brief was a terminal
// with fantasy inside it, and this is that brief as a font pairing.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

const display = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "PacketBrawl",
  description:
    "A Soultale squad battler. Four characters a side, and speed decides who acts.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${display.variable}`}>
      <body className="font-[family-name:var(--font-mono)] antialiased">
        {children}
      </body>
    </html>
  );
}
