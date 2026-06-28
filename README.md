# menuviz.app

Zero-install AR menu PWA: scan a QR, swipe a dish feed, view any dish in AR at
real-world scale, and share a branded photo. See `HANDOFF.md` for the product
and `CLAUDE.md` for working rules and locked decisions.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · `@google/model-viewer`
· bun · Cloudflare Workers (SSR via OpenNext) · nix dev shell.

## Develop

This repo is bun-only and uses a nix dev shell that pins the toolchain and
installs git hooks on entry:

```bash
nix develop          # bun, node, treefmt, nixfmt, lefthook + hooks installed
bun install
bun run dev          # http://localhost:3000
```

Without nix, you still need `bun` on your PATH (`bun install && bun run dev`),
but you won't get `treefmt`/`nixfmt`/`lefthook`.

## Scripts

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `bun run dev`          | Dev server                                      |
| `bun run build`        | Production Next build                           |
| `bun run type-check`   | `tsc --noEmit`                                  |
| `bun run lint`         | ESLint                                          |
| `bun run format`       | Format everything via treefmt (prettier+nixfmt) |
| `bun run build:worker` | Build + bundle the Cloudflare worker (OpenNext) |
| `bun run preview`      | Build + run the worker locally                  |
| `bun run deploy`       | Build + deploy to Cloudflare Workers            |

## Deploy

CI (`.github/workflows/ci.yml`) deploys to **Cloudflare Workers** on push to
`main` and uploads a preview version per PR. It needs two repo secrets:
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
