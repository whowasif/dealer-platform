import type { Metadata } from "next";
import { Inter, Anton } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MIS Solution — Nationwide ICT Network",
  description:
    "MIS Solution brings trusted technology to every upazila in Bangladesh — digital services, business and corporate hardware, and dependable maintenance and support under one national brand.",
  openGraph: {
    title: "MIS Solution — Nationwide ICT Network",
    description:
      "Trusted technology for every upazila in Bangladesh — digital services, business hardware, and dependable maintenance and support under one national brand.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${anton.variable}`}>
      <body>{children}</body>
    </html>
  );
}
