import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp ships a native binary; keep it out of the bundler.
  serverExternalPackages: ["sharp", "@netlify/blobs"],
  async rewrites() {
    return [
      // The player is a static file. The rewrite keeps the query string,
      // so /tv?debug=1 and /tv?preview=1 keep working.
      { source: "/tv", destination: "/tv.html" },
    ];
  },
  async headers() {
    return [
      {
        source: "/tv.html",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
