import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default Cloudflare adapter config. Caching/queue/R2 overrides get wired in
// here once we move 3D assets to R2 + a KV/D1-backed incremental cache.
// See https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig();
