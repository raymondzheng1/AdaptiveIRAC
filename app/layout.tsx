import type { Metadata, Viewport } from "next";
import { Newsreader, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { BRAND_PRIMARY } from "@/lib/brand";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
  display: "swap",
});

const BASE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Pincite — model answers you can actually cite",
    template: "%s · Pincite",
  },
  description:
    "Pincite turns your own cases, statutes and notes into realistic exam practice — and every authority in a model answer is checked against your materials and pinpointed to its exact source. If a point can't be grounded, it says so. It never invents.",
  applicationName: "Pincite",
  keywords: ["law exam practice", "IRAC", "issue spotting", "model answers", "law school revision"],
  openGraph: {
    title: "Pincite — model answers you can actually cite",
    description:
      "Your own cases, statutes and notes become realistic exam practice, with every authority checked against your materials and pinpointed. Free, no sign-up.",
    url: BASE_URL,
    siteName: "Pincite",
    type: "website",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: BASE_URL },
};

export const viewport: Viewport = {
  themeColor: BRAND_PRIMARY,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${hanken.variable} ${plexMono.variable}`}>
      <body>
        {GA4_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}',{anonymize_ip:true});`}
            </Script>
          </>
        ) : null}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
