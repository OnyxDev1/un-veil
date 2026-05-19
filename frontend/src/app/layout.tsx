import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UN/VEIL — Solana Fund Flow Intelligence",
  description: "Trace Solana wallet fund flows, detect sweeps, and surface active meme traders in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
