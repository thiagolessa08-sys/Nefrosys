import type { Metadata } from "next";
import { Public_Sans, Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--ff-sans",
  weight: ["400", "500", "600", "700", "800"],
});
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--ff-serif",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--ff-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Nefrosys",
  description: "Sistema de gestão para clínica de nefrologia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${publicSans.variable} ${newsreader.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
