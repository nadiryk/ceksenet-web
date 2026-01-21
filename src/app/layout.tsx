import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Çek/Senet Takip",
  description: "Çek ve Senet Takip Sistemi",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
