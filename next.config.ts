import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 'soap' relies on Node built-ins; keep it external to the server bundle.
  serverExternalPackages: ["soap"],
  // The marketing-site reference files and the bundled skills dump must never
  // be treated as part of the app source.
  outputFileTracingExcludes: {
    "*": ["./skills/**", "./homepage.html", "./main.css"],
  },
};

export default nextConfig;
