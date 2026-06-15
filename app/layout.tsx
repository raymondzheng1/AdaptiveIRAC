import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const BASE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Adaptive IRAC — exam practice grounded in your own course materials",
    template: "%s · Adaptive IRAC",
  },
  description:
    "Turn your own law course materials into instant exam practice: realistic hypotheticals, model IRAC answers and feedback that cite only the authorities in your materials — every citation pinpointed. Free, no sign-up.",
  applicationName: "Adaptive IRAC",
  keywords: ["law exam practice", "IRAC", "issue spotting", "model answers", "law school revision"],
  openGraph: {
    title: "Adaptive IRAC — practice grounded in your own materials",
    description:
      "Generate exam practice and model IRAC answers from your own course materials. Cites only your syllabus, every citation pinpointed. Free, no sign-up.",
    url: BASE_URL,
    siteName: "Adaptive IRAC",
    type: "website",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: BASE_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
      </body>
    </html>
  );
}
