# CLAUDE.md — menuviz.app

> Operational context for Claude Code. Read this every session. For the full
> product/business narrative and the _why_ behind these decisions, read
> `HANDOFF.md` once at the start of a new workstream.

---

## 1. What this is (one paragraph)

menuviz.app is a **zero-install PWA** that lets restaurant diners scan a QR code,
swipe through a beautiful menu, and view any dish **in AR at true real-world
scale on their own table** — then compose a branded, watermarked photo to share
to Instagram / TikTok / WhatsApp Stories. It is free for diners and (in v1) free
for restaurants. The product is the marketing: every shared photo is an ad. We
are competing on **UX, speed, and virality**, not on being first — the category
is already validated (AR menus drive a reported ~20–26% lift in average order
value).

The two users:

- **Diner** (primary): scans QR → browses → views dish in AR → shares a photo.
- **Restaurant** (secondary): gets a QR + a hosted 3D menu, done-for-you, no work.

---

## 2. Golden rules (do / don't)

**DO**

- Treat the **2D swipeable card feed as the home base on every platform.** AR is
  a per-dish drill-in, never the gate.
- Keep **platform parity in the _mental model_** (tap dish → see it on your
  table) even though the AR machinery differs under the hood.
- Preserve **true real-world scale** on every AR path. This is the core promise.
- Keep the **branded social-capture flow identical on iOS and Android.** It is
  the growth engine, not a cosmetic extra.
- Lazy-load 3D assets per dish; prefetch the next card; cache-first via service
  worker so a re-scan is instant.
- Make everything work over **cellular**. Assume restaurant Wi-Fi is hostile.
- Keep the AR layer behind a **pluggable abstraction** (`ARProvider`) so we can
  swap/upgrade providers without touching feed code.

**DON'T**

- ❌ Never force a native app install on diners. QR → web, always.
- ❌ Never depend on restaurant Wi-Fi, captive portals, or any on-prem hardware.
- ❌ Never put heavy 3D binaries (GLB/USDZ/textures) on Supabase or on S3 with
  egress fees. They go on **Cloudflare R2 + CDN (zero egress)**.
- ❌ Never use a **per-view** WebAR SDK. (Variant Launch is the only sanctioned
  paid fallback, and only post-v1 — it is not per-view.)
- ❌ Never ship **generic AI-generated models for hero dishes.** Hero dishes are
  captured (photogrammetry); generic AI is for the long tail only.
- ❌ Never use `localStorage`/`sessionStorage` for anything that must survive —
  but note we have almost no client-persistent state by design.
- ❌ Never let the iOS AR Quick Look handoff feel like "falling out of the app."
  The entry and return must be branded and intentional.

---

## 3. AR strategy — the runtime decision (memorize this)

iOS Safari **has no WebXR** (confirmed current as of 2026; the settings flag is
non-functional). So AR is a **barbell**:

| Platform    | v1 AR path                                       | Tracking               | Notes                                      |
| ----------- | ------------------------------------------------ | ---------------------- | ------------------------------------------ |
| **Android** | `<model-viewer>` → **Scene Viewer**              | ARCore markerless SLAM | Free, OS viewer, single-object, real scale |
| **iOS**     | `<model-viewer>` → **AR Quick Look** (USDZ)      | ARKit markerless       | Free, OS viewer, single-object, real scale |
| **Both**    | **Custom canvas compositor** for the share photo | none needed            | Static composed shot — no SLAM required    |

Key insight: **Scene Viewer already uses ARCore SLAM** for markerless placement,
so "full markerless SLAM on Android" is satisfied in v1 _without_ building custom
WebXR. We get markerless real-scale placement on both platforms for free via
`<model-viewer>`, with platform parity.

**Custom in-page WebXR (three.js `WebXRManager`) on Android** — for live
multi-object arrangement with our own UI — is a **v2 enhancement**, not v1.
**Marker-anchored MindAR on iOS** (using the table-tent/coaster as anchor) is the
v2 path to approach parity for that rich experience. **No physical markers are
needed in v1** — both platforms place markerless.

### Pseudocode for the AR layer

```
ARProvider.resolve():
  if iOS:                      -> QuickLookProvider   (model-viewer, USDZ)
  else if Android + WebXR:     -> SceneViewerProvider (model-viewer, GLB)   // v1
                                  // v2: WebXRInlineProvider (three.js)
  else:                        -> InlineViewerProvider (orbit-only 3D, no AR)
SocialCapture: always custom canvas compositor (platform-independent)
```

Always **feature-detect**, never user-agent-sniff for capability gating (UA only
to choose Quick Look vs Scene Viewer asset format).

---

## 4. Tech stack (recommended defaults — see HANDOFF §"Open decisions" before overriding)

- **Frontend:** Next.js (App Router) + TypeScript. SSR the menu pages for
  per-location SEO + fast first paint; AR/3D run as client components.
  - _Lighter alt:_ React + Vite SPA, if SEO is deprioritized. Pick one and note it.
- **3D / AR:** `@google/model-viewer` for the v1 AR launcher (handles Quick Look
  - Scene Viewer + the `<model-viewer>` inline orbit fallback). `three.js`
    (+ `@react-three/fiber`, `drei`) for the inline viewer and the future custom
    WebXR path and the capture compositor canvas.
- **Data / auth / restaurant CMS:** Supabase (Postgres + Auth + Storage for
  _non-asset_ data only).
- **3D asset + image hosting/CDN:** Cloudflare R2 + Cloudflare CDN (**zero egress**).
- **Hosting / edge:** Cloudflare Pages or Vercel for the app; edge functions for
  the handful of dynamic endpoints. **No bespoke AWS Lambda/EC2.**
- **PWA:** service worker (Workbox or Next PWA) — cache-first for assets, network
  for menu JSON, prefetch next dish.
- **Analytics:** lightweight, privacy-respecting event pipeline (see §8). Avoid
  heavy third-party SDKs that slow first paint.

---

## 5. Proposed repo structure (greenfield — create as you scaffold)

```
menuviz/
├─ CLAUDE.md
├─ HANDOFF.md
├─ apps/
│  └─ web/                     # the diner-facing PWA
│     ├─ app/
│     │  └─ [brand]/[location]/   # SSR menu route -> menuviz.app/kfc/downtown
│     ├─ components/
│     │  ├─ feed/             # swipeable card feed (home base)
│     │  ├─ ar/               # ARProvider + providers (QuickLook/SceneViewer/Inline)
│     │  ├─ capture/          # canvas compositor + watermark + share sheet
│     │  └─ ui/               # design system primitives
│     ├─ lib/                 # data fetching, supabase client, analytics
│     └─ public/
├─ apps/
│  └─ studio/                 # (later) restaurant CMS / menu manager dashboard
├─ packages/
│  ├─ pipeline/               # 3D asset pipeline CLI (capture->optimize->convert)
│  └─ shared/                 # shared types, constants, design tokens
└─ infra/                     # IaC / config for R2, edge, supabase migrations
```

Start with `apps/web`. `studio` and `pipeline` can begin as scripts and graduate
to apps/packages.

---

## 6. Data model (starting sketch — Postgres / Supabase)

```
brands          (id, slug, name, logo_url, theme_json)
locations       (id, brand_id, slug, name, address, currency,
                 menu_overrides_json, active)
menu_items      (id, brand_id, name, description, price, category,
                 ingredients_json, allergens_json, poster_image_url, active)
models          (id, menu_item_id, glb_url, usdz_url, scale_meta_json,
                 source_type ['capture'|'ai'], quality_tier, version)
location_items  (location_id, menu_item_id, available, price_override) -- join
events          (id, ts, session_id, location_id, menu_item_id, type, meta_json)
```

- Public URL `menuviz.app/{brand.slug}` resolves to a default/brand menu.
- Physical QR encodes `{brand.slug}/{location.slug}` (or short `/r/{code}`) so
  menu, pricing, and availability vary per franchise and analytics are per-location.
- Models are versioned; never overwrite a live model URL (cache-busting + rollback).

---

## 7. Performance budget (hard targets — treat as tests)

- **< 3s** to first meaningful render of the feed on mid-tier mobile + 4G.
- **Per-model GLB ≤ ~1–3 MB** (Draco/meshopt geometry, KTX2/Basis textures,
  texture resolution capped — typically ≤ 2K, often 1K for food).
- Feed poster images: responsive, AVIF/WebP, lazy below the fold.
- Prefetch the **next** dish's model + poster while the current card is in view.
- Service worker: cache-first for `*.glb`, `*.usdz`, textures, posters.
- No render-blocking third-party scripts. Defer analytics.

---

## 8. Analytics events (the funnel — instrument from day one)

The **north-star metric is share rate** (shares ÷ sessions). Track the full
funnel so we can prove the viral loop:

```
scan            session opened from a QR / link
feed_view       feed rendered
dish_view       a dish card focused/opened
ar_enter        user launched an AR view (Quick Look / Scene Viewer)
ar_place        model placed on a surface (where detectable)
capture_open    opened the photo compositor
capture_taken   composed a shot
share           tapped share to IG/TikTok/WhatsApp/etc.
```

Each event carries `session_id`, `location_id`, `menu_item_id`, `platform`.
No diner PII. Camera frames never leave the device.

---

## 9. 3D asset pipeline (conventions)

Pipeline lives in `packages/pipeline`. Stages:

1. **Capture** — hero dishes via photogrammetry (RealityScan / Epic). Tricky or
   long-tail items via AI image-to-3D, preferring **self-hosted open models
   (TRELLIS / Hunyuan3D)** over paid per-call APIs.
2. **Optimize** — `gltf-transform` (Draco + meshopt + KTX2/Basis + texture caps)
   to hit the size budget. One canonical optimized GLB per dish.
3. **Convert** — generate USDZ from the optimized GLB (Reality Converter /
   `usdzconvert` / `usd_from_gltf` / three.js `USDZExporter`). Verify real-world
   scale survives conversion (scale is the product).
4. **Publish** — upload GLB + USDZ + poster to R2; write `models` row with
   versioned URLs.

Food is hard for photogrammetry (gloss, translucency, sauces) — always have the
AI fallback so a bad scan never blocks a menu going live.

---

## 10. Environment / config (placeholders — fill on scaffold)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only
R2_ACCOUNT_ID= / R2_ACCESS_KEY= / R2_SECRET= / R2_BUCKET=
CDN_BASE_URL=                     # public asset base (R2 custom domain)
ANALYTICS_WRITE_KEY=
```

Secrets never in the client bundle. Asset URLs are public CDN paths.

---

## 11. Commands (greenfield — define as you scaffold, keep this current)

```
# once scaffolded (Next.js example)
npm run dev          # local dev
npm run build        # production build
npm run lint         # eslint + typecheck
npm run test         # unit/integration
# pipeline
pnpm pipeline build <dish>   # capture/optimize/convert/publish a model
```

> First task: scaffold `apps/web`, wire Supabase + R2 clients, render a hardcoded
> menu, prove the AR launch + capture loop end-to-end (see HANDOFF §"First milestones").

---

## 12. Conventions

- TypeScript strict. Shared types in `packages/shared`.
- Components small and presentational; data fetching in `lib/`.
- Feature-detect capabilities; never gate features on UA strings.
- Every new AR path implements the `ARProvider` interface — no AR logic leaks
  into feed components.
- Keep the watermark/branding tokens in one place (`packages/shared/branding`).
- Accessibility: the feed must be usable without AR (orbit-only fallback) and
  with reduced motion.
