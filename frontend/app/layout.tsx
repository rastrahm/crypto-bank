import type { Metadata } from "next";
import type { JSX } from "react";
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
  title: "Crypto Bank Vault",
  description: "Demo Next.js + ethers.js del vault multi-activo",
};

/**
 * @description Layout raíz de la aplicación.
 * @param {object} props - Props del layout.
 * @param {React.ReactNode} props.children - Contenido de la ruta.
 * @returns {JSX.Element} HTML base.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
