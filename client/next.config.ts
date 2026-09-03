import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this app's directory. The repo is a
  // multi-package monorepo (root tooling + /server) with several lockfiles, so
  // we tell Turbopack explicitly where the client app root is.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // Company logos are arbitrary remote URLs rendered via next/image
    // (CompanyLogo). Allow any HTTPS host in development; tighten this to
    // specific hostnames before production.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
