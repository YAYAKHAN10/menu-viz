import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

// Enables the OpenNext Cloudflare bindings (R2, KV, env) inside `next dev`,
// so `getCloudflareContext()` behaves locally as it does on Workers.
// Gated to dev only: the helper boots miniflare/workerd, which has no place in a
// production `next build` and must never be able to fail one. See
// https://opennext.js.org/cloudflare
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev().catch(() => {});
}
