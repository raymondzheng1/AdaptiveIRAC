import type { MetadataRoute } from "next";
import { BRAND_BG, BRAND_PRIMARY } from "@/lib/brand";

/** Web app manifest — makes the app installable (harness §19.2). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Adaptive IRAC — grounded exam practice",
    short_name: "Adaptive IRAC",
    description:
      "Turn your own course materials into exam practice with verified, pinpointed citations.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BRAND_BG,
    theme_color: BRAND_PRIMARY,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
