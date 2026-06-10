import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { PhoneStatusBar } from "@/components/ui/PhoneStatusBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial serif for titles + key figures (the `--serif` token).
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Goldvale — a calm daily companion for senior pets",
  description:
    "A 20-second daily check-in that trends a validated mobility score, remembers patterns, and prepares a vet-ready brief. Goldvale supports your vet's plan — it never diagnoses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="gv-stage">
          <div className="gv-device">
            <span className="gv-island" aria-hidden />
            <PhoneStatusBar />
            <div className="gv-screen gv-scroll">{children}</div>
            <span className="gv-home" aria-hidden />
          </div>
        </div>
      </body>
    </html>
  );
}
