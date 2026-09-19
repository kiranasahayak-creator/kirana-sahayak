import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kirana Sahayak",
  description: "Voice-driven POS and demand forecasting for local stores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
