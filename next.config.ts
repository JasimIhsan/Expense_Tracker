import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Serwist's Next plugin only runs under webpack, so the service worker is
// skipped in dev and the production build uses `next build --webpack`.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
});

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSerwist(nextConfig);
