import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root (a stray parent lockfile would otherwise be picked).
  outputFileTracingRoot: projectRoot,
  // Parsing libs (mammoth, unpdf, jszip) run server-side only.
  serverExternalPackages: ["unpdf", "mammoth"],
  experimental: {
    // Long generations can take a while; allow streaming responses.
    proxyTimeout: 300_000,
  },
};

export default nextConfig;
