# CLAUDE.md — menuviz.app

> Operational context for Claude Code. **Read this every session.** It is the map
> of the codebase as it actually exists today. For the product/business _why_ and
> the strategic narrative, read `HANDOFF.md` once at the start of a new workstream.
>
> Last full sync: **2026-06-30** (the branch `feat/ar-menu-configurator`, PR #1).

---

## 1. What this is (one paragraph)

menuviz.app is a **zero-install PWA** that lets a restaurant diner scan a QR code,
browse a menu rendered as **live 3D over their phone camera**, customise a dish
with add-ons, drop it on their real table **in AR at true real-world scale**, and
share a **branded, watermarked photo** to Instagram / TikTok / WhatsApp Stories.
It's free for diners and (in v1) free for restaurants. **The product is the
marketing** — every shared photo is an ad. We compete on **UX, speed, and
virality**. North-star metric: **share rate** (shares ÷ sessions).

Two users:

- **Diner** (primary): scan → browse the camera-first 3D menu → customise → AR
  drop on table → share a photo.
- **Restaurant** (secondary): gets a QR + a hosted 3D menu, done-for-you.

---

## 2. Current status (read this first)

**Built and working** (verified: typecheck, lint, `next build`, served smoke,
Cloudflare Worker preview deploy):

- Camera-first **single-screen** diner experience (`MenuStage`): category strip,
  horizontal swipe between items, drag-to-rotate, tap-to-customise.
- **Live 3D preview via react-three-fiber** (`DishStage`) — base dish + toggleable
  add-on models on a tray. (Replaced `<model-viewer>`, which is **removed**.)
- **Add-on configurator**: each add-on is its own model (primitive placeholder
  until a real GLB is supplied) with live price roll-up.
- **AR (browse-and-drop)**: Android **Scene Viewer** via ARCore intent at fixed
  real-world scale; iOS **Quick Look** path wired (off until USDZ exists).
- **Branded share photo**: composited from the WebGL canvas over the camera frame.
- **Two real optimised models** (beef burger, crispy chicken), Draco + JPEG,
  ~1 MB, normalised to true meters, deployed to **Cloudflare R2**.
- **Per-branch menus** (availability + price overrides) and **dynamic tracking
  links** (`?branch` / `?src` / `?d`) flowing into analytics; a `/links` QR board.
- Full asset pipeline scripts (`gltf-transform`-based) + R2 sync CLI.

**Pending / next** (see §16):

- **Combo baking for AR**: AR currently drops the **base dish only**. Add-ons in
  AR need pre-baked per-combo GLB/USDZ files. `resolveArModel()` in `lib/ar.ts`
  is the seam.
- **iOS AR**: `USDZ_READY=false` — no USDZ generated yet, so iPhone uses the
  photo-capture path. Generate USDZ per dish/combo, then flip the flag.
- **Real add-on GLBs**: add-ons render as primitive placeholders today.
- **Analytics sink**: `sendEvent` in `lib/analytics.ts` is a no-op (vendor TBD).
- **Orphaned file**: `src/hooks/useModelPreloader.ts` is unused since the
  `MenuStage` rewrite — safe to delete.

---

## 3. Golden rules (do / don't)

**DO**

- Treat the **camera-first 3D browse stage as home base.** Customise and AR-drop
  are per-dish actions; AR is never the gate. The experience must work without
  ever launching OS AR (orbit preview + photo capture are the universal path).
- Preserve **true real-world scale** on every AR path — this is the core promise.
  GLBs are authored in **meters**; AR launches with fixed scale (no pinch-resize).
- Keep the **branded share-capture flow identical on iOS and Android.** It is the
  growth engine, not a cosmetic extra. It works with **no SLAM** (a composed shot).
- Author **each add-on as its own GLB** and compose. For OS AR (single-file
  viewers), pre-bake the chosen combinations; for the live preview, R3F toggles
  models on the fly.
- Keep all AR launch logic behind `lib/ar.ts` (the AR seam). `resolveArModel()` is
  where combo URLs plug in. No AR/UA logic leaks into UI components.
- Lazy-load 3D per dish; assume **hostile restaurant Wi-Fi** — design for cellular.
- Feature-detect capability where possible; UA only to choose Scene Viewer vs
  Quick Look and to gate the AR button.

**DON'T**

- ❌ Never force a native app install. QR → web, always.
- ❌ Never depend on restaurant Wi-Fi, captive portals, or on-prem hardware.
- ❌ Never put heavy 3D binaries (GLB/USDZ/textures) on Supabase or egress-billed
  storage. They go on **Cloudflare R2 + CDN (zero egress)**.
- ❌ Never compress models for AR with **meshopt or WebP textures** — Android Scene
  Viewer needs **Draco geometry + JPEG/KTX2 textures** (see §8). meshopt/webp
  render in the in-page viewer but can break Scene Viewer placement.
- ❌ Never ship generic AI-generated models for **hero** dishes (capture them);
  generic AI is for the long tail only.
- ❌ Never reintroduce `@google/model-viewer` for the preview — it is single-model
  and cannot show toggleable add-ons. The preview is react-three-fiber.
- ❌ Never use `localStorage`/`sessionStorage` for anything that must survive (we
  have almost no client-persistent state by design).

---

## 4. Codebase map (every file, what it does)

Repo is a **flat `src/` Next.js App Router app** (not the `apps/web` monorepo the
old docs sketched). Migrate toward a monorepo only when `studio`/`pipeline`
actually need it.

### Routes — `src/app/`

- `layout.tsx` — root layout; Geist + Geist Mono fonts; metadata; `html/body`.
- `globals.css` — Tailwind v4 import; `:root` tokens (`--background:#000`,
  `--foreground:#fff` — **no warm neutral**); global tap-highlight reset;
  `.no-scrollbar` util. (All old CSS-plate / model-viewer styles were removed.)
- `page.tsx` — home `/` → default restaurant (`stacked`), default branch, full
  branch menu → `<CameraMenu … campaign="direct">`.
- `restaurants/[slug]/page.tsx` — **SSR dynamic** menu route. Reads `?branch`,
  `?src` (campaign), `?d` (deep-link dish). Resolves restaurant + branch + branch
  menu; `notFound()` on bad slug; passes `toRestaurantMeta(restaurant)` (slim, no
  full dish list) + resolved `dishes` + `campaign` + `initialDishId`.
- `links/page.tsx` — `/links` internal/demo page (noindex). `getTrackingLinks` →
  `<LinksBoard>`. One QR per branch + per dish.

### Components — `src/components/` (all `"use client"`)

- **`CameraMenu.tsx`** — the shell. Opens the rear camera (`getUserMedia`, with
  constraint fallbacks), shows the hero image until the stream is live, handles
  the camera-blocked/retry state and the top nav chip. Exposes
  `captureBackgroundFrame()` (draws the current video frame to a canvas →
  dataURL) used by the share compositor. Renders `<MenuStage>`. Fires
  `menu_session_started`, `camera_*` events.
- **`MenuStage.tsx`** — **THE diner screen.** Single screen: top category strip
  (tap to switch), horizontal swipe between items, drag-to-rotate, tap-to-
  customise. Owns: `sections` (derived from the branch `dishes`, category order =
  first-appearance), per-dish add-on selection state (`selectionByDish`),
  rotation, AR launch, and the capture flow. Renders `<DishStage>` (dynamically
  imported, `ssr:false`), the info panel (name/subtitle/price + progress dots),
  the customiser chips, the action row (**View on my table** / **Share a photo**),
  and the `<DishCapture>` modal. Gesture model: drag rotates, a forceful
  horizontal flick changes item, a clean tap toggles the customiser.
  `useSyncExternalStore` client-gates the AR button to avoid hydration mismatch.
  Fires `menu_navigation`, `category_opened`, `addon_toggled`, `ar_launched`,
  `capture_*`, `share`.
- **`DishStage.tsx`** — the **react-three-fiber** preview. `<Canvas>` with
  `preserveDrawingBuffer` (so we can snapshot it), lights + `ContactShadows`.
  Loads the base dish GLB (Draco via `useGLTF(url, true)`), **normalises** it
  (centre on X/Z, rest on ground, scale to a preview target), and renders each
  selected add-on (its GLB if present, else a primitive placeholder shaped by
  `kind`) positioned in an arc. Rotation is driven by the parent. `CaptureBridge`
  registers a `capture()` that returns `canvas.toDataURL` (transparent PNG).
- **`DishCapture.tsx`** — native `<dialog>` share modal. Shows the composed
  preview; **Share** (Web Share API with a file) → download fallback; **Save**.
  Fires `share` via `onShared`.
- **`LinksBoard.tsx`** — the `/links` board. Per-branch sections; a QR per link
  (`qrcode.toDataURL`); copy-to-clipboard. Absolute URLs via a lazy
  `useState(window.location.origin)`.

### Data — `src/data/restaurant.ts`

The hardcoded menu + resolvers. `restaurants[]` is the **"Stacked"** demo store:
2 dishes (`beef-burger`, `crispy-chicken`), 3 branches (`f7-markaz`, `dha-lahore`,
`airport-express`) each with a per-branch `menu` (availability + optional price
override). `USDZ_READY=false` (iOS AR off). Exports: `getDefaultRestaurant`,
`getRestaurantBySlug`, `getRestaurantBranch`, **`getBranchMenu`** (filters to
available items + applies price overrides → `MenuDish[]`), `getDishById`.

### Libraries — `src/lib/`

- **`assets.ts`** — `dishModelUrl` / `dishUsdzUrl`. Resolves via
  `NEXT_PUBLIC_CDN_BASE` (R2/CDN) when set, else local `public/` fallback.
  Inlined at build time.
- **`analytics.ts`** — `trackMenuEvent(name, ctx)` → `sendEvent` seam (**no-op**
  today; wire the pipeline here). Carries the event union + `AnalyticsContext`.
- **`ar.ts`** — the **AR seam.** `detectArCapability()` (UA: iOS→`quick-look`,
  Android→`scene-viewer`, else `none`), `canLaunchAr(dish)`, `launchAr(dish,
addOns)`, `launchSceneViewer` (ARCore `intent://` with `resizable=false` for
  fixed scale + a `browser_fallback_url`), `launchQuickLook` (`rel="ar"` anchor),
  and **`resolveArModel(dish, addOns, platform)`** — returns the base dish today;
  this is where pre-baked combo URLs plug in.
- **`composeShareImage.ts`** — the canvas compositor. Builds a 9:16 (1080×1920)
  branded shot: camera frame (or dark gradient) + the dish PNG + legibility scrim
  - the dish's accent rule + `MENUVIZ.APP` wordmark + dish name/price → JPEG blob.
- **`links.ts`** — `getTrackingLinks(restaurant)` → per-branch and per-item deep
  links (`?branch` / `?src` / `?d`); `toAbsolute(origin, path)`.

### Types — `src/types/restaurant.ts`

`Dish`, `AddOn` (+ `AddOnKind`), `BranchMenuItem`, `RestaurantBranch`,
`Restaurant`, **`MenuDish`** (a branch-resolved dish with effective price),
**`RestaurantMeta`** (the slim client prop — slug/name/currency/heroImageUrl, so
the full menu never ships to the client) + `toRestaurantMeta()`.

### Hooks — `src/hooks/`

- `useModelPreloader.ts` — **orphaned** (was used by the retired carousel).
  Delete when convenient.

### Scripts — `scripts/` (run with `bun run scripts/<x>.ts`)

- **`assets.ts`** — R2 sync CLI: `list` / `push` / `prune` / `sync` / `rm`. Auth
  via `CLOUDFLARE_API_TOKEN` env or the `.cf-token` file. Bucket `menuviz-assets`,
  key prefix `models/dishes/`, sets correct content-types + immutable cache.
- **`prep-chicken.ts`** — one-off: weld + compute smooth normals + assign a warm
  "crispy" PBR material to the Meshy chicken export (which shipped POSITION-only).
- **`normalize-scale.ts`** — scales a GLB so its largest horizontal dimension =
  a target size in **meters**. Run **before** `gltf-transform optimize` (positions
  must still be plain f32, not yet quantised).

### Config (root)

`next.config.ts` (dev-only OpenNext binding init, gated to `NODE_ENV=development`),
`open-next.config.ts`, `wrangler.jsonc` (worker **`menu-viz`**), `public/_headers`,
`shell.nix` / `flake.nix` (nix is the source of truth), `treefmt.toml`,
`lefthook.yml` (pre-commit: lint+fmt; pre-push: type-check), `eslint.config.mjs`,
`.env.example` / `.env.local` (`NEXT_PUBLIC_CDN_BASE`), `.cf-token` (gitignored),
`r2-cors.json`, `.github/workflows/ci.yml` (see §14).

---

## 5. Data model (current shape)

```
Restaurant   { slug, name, cuisine, location, currency, defaultBranchId,
               branches[], dishes[], heroImageUrl, rating, description }
Dish         { id, name, subtitle, description, price, category,
               modelUrl?, iosModelUrl?, prepTime, pairing, highlights[],
               modelColors{primary,secondary,accent}, addOns?[] }
AddOn        { id, name, price, kind('side'|'drink'|'extra'|'wrap'),
               modelUrl?, placeholderColor?, defaultOn? }
RestaurantBranch { id, name, address, city, country, menu: BranchMenuItem[] }
BranchMenuItem   { dishId, available, price? }          -- the location join
MenuDish     = Dish & { price }                          -- branch-resolved
RestaurantMeta = Pick<Restaurant, slug|name|currency|heroImageUrl>  -- client prop
```

- Physical QR encodes `/{brand}/{location}` via `/restaurants/{slug}?branch={id}`
  (+ optional `&src=` campaign and `&d=` deep-link dish) so menu, pricing,
  availability, and analytics vary per franchise. `/links` generates these.
- The diner UI receives **`RestaurantMeta` + branch-resolved `MenuDish[]`**, never
  the full restaurant (don't leak unavailable dishes into the client payload).
- Future Supabase tables (`brands`, `locations`, `menu_items`, `models`,
  `location_items`, `events`) mirror this; the data layer is the swap-in seam.

---

## 6. The diner flow (how components connect)

```
page / [slug] (server)
  └─ getBranchMenu → CameraMenu (camera shell + getBackgroundFrame)
        └─ MenuStage (gestures, state, analytics)
              ├─ DishStage (R3F: base dish + add-on models, capture())   ← dynamic, ssr:false
              ├─ customiser chips (toggle add-ons → DishStage updates live)
              ├─ "View on my table" → lib/ar.launchAr (Scene Viewer / Quick Look)
              └─ "Share a photo" → DishStage.capture() + getBackgroundFrame()
                       → composeShareImage → DishCapture (Web Share / download)
```

---

## 7. AR strategy — the runtime decision (memorise this)

iOS Safari **has no WebXR** (confirmed current as of 2026; the settings flag is
non-functional). So AR is a **barbell**, and the live multi-model preview is ours:

| Layer                   | Android                                                                 | iOS                                                          |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Live 3D preview**     | react-three-fiber (our `DishStage`) — multi-model, add-ons toggle live  | same                                                         |
| **OS AR drop**          | **Scene Viewer** via ARCore `intent://` (`lib/ar.ts`), fixed real scale | **Quick Look** (USDZ) via `rel="ar"` — off until USDZ exists |
| **Branded share photo** | Custom canvas compositor — no SLAM needed                               | same                                                         |

Key facts:

- **OS AR viewers are single-object and take one pre-baked file from a URL.** You
  cannot toggle add-ons or swipe items inside Scene Viewer/Quick Look. So add-ons
  in AR = **pre-baked combination GLB/USDZ** (the "browse-and-drop" model the
  product is built around). `resolveArModel()` is the seam; today it returns the
  base dish.
- We **dropped `<model-viewer>`** because it is single-model (can't show
  toggleable add-ons) and we now launch Scene Viewer/Quick Look directly. Scene
  Viewer's `intent://arvr.google.com/scene-viewer/...&resizable=false` is Google's
  own documented launch and preserves real-world scale.
- The model URL handed to Scene Viewer must be **absolute https** (R2 CDN base
  gives this; `lib/ar.ts` absolutises relative URLs as a fallback).

### Roadmap beyond browse-and-drop

- **v2 — Android live AR:** custom in-page WebXR (three.js `WebXRManager` /
  `@react-three/xr`) for live multi-object arrangement + add-on toggling **inside**
  the AR session. Android-only (iOS has no WebXR).
- **v2 — iOS parity:** marker-anchored MindAR (table tent as anchor) if we want
  rich live AR on iPhone. Not needed for browse-and-drop.

---

## 8. 3D asset pipeline (commands + the gotchas that bite)

Source-of-truth dir: **`public/models/dishes/`** (`<dishId>.glb`, `<dishId>.usdz`).
The app serves from R2 in production (`NEXT_PUBLIC_CDN_BASE`) but the repo tracks
the GLBs as the local fallback.

**Tooling:** `gltf-transform` CLI via `bunx @gltf-transform/cli` (heavy steps), plus
`@gltf-transform/core` + `@gltf-transform/functions` (dev deps) for the prep
scripts. **Both pull in `sharp`**, which needs `libstdc++`. In the nix sandbox it
isn't on the default path → export it first:

```bash
export LD_LIBRARY_PATH=/nix/store/<gcc-NN-lib>/lib:$LD_LIBRARY_PATH
# find it: ls -d /nix/store/*gcc*-lib/lib 2>/dev/null
```

(Real dev/CI shells have libstdc++; this is only the sandbox quirk.)

**The recipe that produced the current models** (Meshy/Tripo exports → demo-ready):

```bash
# 0. (chicken only) it shipped POSITION-only → add normals + a material first
bun run scripts/prep-chicken.ts "<source>.glb" /tmp/chicken-prep.glb

# 1. normalise to REAL-WORLD METERS (before optimize; burger 0.12, chicken 0.15)
bun run scripts/normalize-scale.ts <in>.glb /tmp/<x>-scaled.glb 0.12

# 2. optimise — DRACO geometry + JPEG textures (Scene Viewer-safe), simplify, cap
bunx @gltf-transform/cli optimize /tmp/<x>-scaled.glb public/models/dishes/<id>.glb \
  --compress draco --simplify-ratio 0.12 --simplify-error 0.001 \
  --texture-compress auto --texture-size 1024
#   ⚠ use draco + auto/jpeg, NOT meshopt + webp (Scene Viewer compatibility)

# 3. validate + check real-world bbox
bunx @gltf-transform/cli validate public/models/dishes/<id>.glb
bunx @gltf-transform/cli inspect  public/models/dishes/<id>.glb   # bbox ≈ target meters

# 4. deploy to R2 (push the two new, prune stale placeholders)
bun run assets:sync
```

**Stages (general):** capture hero dishes (photogrammetry) / AI-generate the tail
(prefer self-hosted TRELLIS/Hunyuan3D over per-call APIs) → optimise to the size
budget → (for iOS) convert GLB→USDZ and verify scale survives → publish to R2.

**Budget:** per-model **≤ ~1–3 MB** (current: burger 1.21 MB, chicken 748 KB).

**Combo baking (the next pipeline step):** for AR add-ons, merge the base dish +
selected add-on GLBs onto a tray into one GLB (and USDZ), name by combo, upload to
R2, and have `resolveArModel()` map the selected set → that URL.

---

## 8a. Asset hosting (R2 + CDN)

3D binaries live in **Cloudflare R2** served through a CDN domain, never bundled in
the app, never on egress-billed storage.

- **Public delivery = a custom domain on the bucket** (prod) or the `*.r2.dev` dev
  URL (current: `NEXT_PUBLIC_CDN_BASE=https://pub-…​.r2.dev`). r2.dev is
  rate-limited/uncached — fine for the demo, move to `cdn.menuviz.app` for prod.
- **Content types:** `.glb` → `model/gltf-binary`, `.usdz` → `model/vnd.usdz+zip`
  (the `assets.ts` script sets these on upload; wrong types break the viewers).
- **CORS:** the R3F/`useGLTF` fetch is an XHR, so the bucket needs `GET`/`HEAD`
  CORS for the app origin (currently `*`). Scene Viewer/Quick Look fetch the file
  themselves and need HTTPS + range requests (R2 + CDN provide both — verified
  `206 Partial Content`).
- **App wiring:** `NEXT_PUBLIC_CDN_BASE` (`lib/assets.ts`). Inlined at build time —
  must be present for `build` / `build:worker` (local `.env.local`, CI repo var,
  baked into the worker build).
- A Worker **R2 binding** is only needed for app-side logic (signed uploads); pure
  public delivery is the CDN domain, no binding.

---

## 9. Tech stack (current)

- **Frontend:** Next.js 16 (App Router) + TypeScript strict. SSR the menu route for
  per-location SEO + fast first paint; the 3D stage is a client component.
- **3D / AR:** **`three` + `@react-three/fiber` + `@react-three/drei`** for the
  live preview and capture canvas. **AR launches the OS viewers directly** via
  `lib/ar.ts` (no `@google/model-viewer`). `@gltf-transform/*` for the pipeline.
- **QR:** `qrcode` (the `/links` board).
- **Data / auth / CMS (future):** Supabase (Postgres + Auth + Storage for
  _non-asset_ data only) — **not yet wired**; data is hardcoded in
  `data/restaurant.ts`.
- **Asset/image hosting:** Cloudflare R2 + CDN (zero egress).
- **Hosting / edge:** **Cloudflare Workers** (SSR via `@opennextjs/cloudflare`).
- **Analytics:** vendor **TBD**; events go through the `sendEvent` seam in
  `lib/analytics.ts`. No Vercel Analytics.

### 9a. Decisions locked (don't reopen without a stated reason)

- **Framework: Next.js (App Router), TS strict.** Not Vite.
- **Package manager: bun, strictly** (only `bun.lock`).
- **Hosting: Cloudflare Workers, SSR via OpenNext.** Not Pages static export, not
  Vercel. (A Vercel integration auto-deploys PRs but its previews are **auth-gated
  / not the sanctioned path** — use the Worker preview.)
- **3D preview: react-three-fiber.** AR launch: **direct Scene Viewer / Quick Look**
  (`lib/ar.ts`). `model-viewer` removed.
- **AR model compression: Draco + JPEG** (Scene Viewer compatibility), not
  meshopt/webp.
- **Tooling: nix-first.** `shell.nix` is the source of truth; `treefmt` (prettier +
  nixfmt) + `lefthook` gate commits; CI mirrors them.
- **Still open:** service-worker/PWA tooling, the analytics sink, USDZ generation,
  the Supabase data layer, the short-link scheme.

---

## 10. Performance budget (hard targets — treat as tests)

- **< 3s** to first meaningful render on mid-tier mobile + 4G.
- **Per-model GLB ≤ ~1–3 MB** (Draco geometry, JPEG/KTX2 textures ≤ 1K for food).
- Lazy-load 3D per dish; prefetch neighbours; cache-first via service worker (the
  SW is not built yet — when it lands, cache `*.glb`/`*.usdz`/textures/posters).
- No render-blocking third-party scripts. Defer analytics.
- Honour `prefers-reduced-motion` (the experience is motion-heavy).

---

## 11. Analytics events (the funnel — north-star = share rate)

Defined in `lib/analytics.ts` (`MenuAnalyticsEvent` union). Each event carries
`AnalyticsContext` (`restaurantSlug`, `restaurantName`, `branchId`, `branchName`,
`category`, `dishId`, `dishName`, `campaign` (from `?src`), `source`, …). No diner
PII; camera frames never leave the device.

```
menu_session_started   camera_started / camera_live / camera_blocked / camera_unsupported
category_opened        menu_navigation        addon_toggled
ar_launched            model_load_* (started/ready/slow/error/retry) / model_preload_failed
capture_open           capture_taken          capture_failed          share
```

`campaign` ties every event to a QR/branch tracking link. The funnel that matters:
`menu_session_started → … → ar_launched / capture_taken → share`.

---

## 12. Commands

```bash
bun run dev              # local dev (next dev)
bun run build            # production build (next build)
bun run start            # serve the production build
bun run lint             # eslint (note: .github/skills detector files emit warnings — ignore)
bun run type-check       # tsc --noEmit
bun run format           # treefmt (prettier + nixfmt)
bun run build:worker     # OpenNext → Cloudflare Worker build
bun run preview          # build:worker + local worker preview
bun run deploy           # build:worker + wrangler deploy (prefer CI)
# assets (R2)
bun run assets:list      # show remote objects + drift vs local
bun run assets:push      # upload local GLB/USDZ with correct content-types
bun run assets:prune     # delete remote objects with no local file
bun run assets:sync      # push then prune (make R2 match public/models/dishes/)
bun run scripts/assets.ts rm <dishId|key>   # delete a model from R2
# model pipeline (see §8; export LD_LIBRARY_PATH first in the sandbox)
bun run scripts/prep-chicken.ts   <in> <out>
bun run scripts/normalize-scale.ts <in> <out> <targetMeters>
```

Gates that must pass before pushing: `type-check`, `lint` (0 errors), `build`,
`format`. `lefthook` runs lint+fmt on commit and type-check on push.

---

## 13. Environment / config

```
NEXT_PUBLIC_CDN_BASE=        # public asset base (R2 r2.dev URL or cdn.menuviz.app); inlined at build
CLOUDFLARE_API_TOKEN=        # or a .cf-token file (gitignored) — for scripts/assets.ts
CLOUDFLARE_ACCOUNT_ID=       # defaults baked into scripts/assets.ts
R2_BUCKET=                   # default: menuviz-assets
# future (not yet wired):
NEXT_PUBLIC_SUPABASE_URL= / NEXT_PUBLIC_SUPABASE_ANON_KEY= / SUPABASE_SERVICE_ROLE_KEY=
ANALYTICS_WRITE_KEY=
```

Secrets never in the client bundle. Asset URLs are public CDN paths.

---

## 14. Deploy / CI (`.github/workflows/ci.yml`)

- **Push to `main`** → Format → Lint+Type-check+Build → **`wrangler deploy`**
  (production worker `menu-viz`).
- **Pull request to `main`** → checks → **`wrangler versions upload`** =
  **preview deploy**; CI comments a `*.workers.dev` preview URL (the canonical way
  to test on a device before merging).
- A **Vercel** integration also auto-deploys, but its previews are **auth-gated
  (SSO 302)** — not the sanctioned host; use the Cloudflare Worker preview.
- To test on Android: open a PR, wait for the Worker preview URL comment, scan/open
  it on an ARCore Chrome device.

---

## 15. Conventions

- TypeScript strict. Components small and presentational; data fetching/logic in
  `lib/` and `data/`.
- **React Compiler is on** (eslint errors, not warnings): don't hand-write a
  `useMemo` it can't preserve (compute plainly and let it memoise); don't call
  impure functions (`performance.now()`, `Date.now()`, `Math.random()`) or
  synchronous `setState` in render/effects — use `event.timeStamp`, lazy
  `useState` initialisers, or `useSyncExternalStore`.
- Feature-detect capabilities; UA only to pick Scene Viewer vs Quick Look.
- All AR logic stays in `lib/ar.ts`; all share-image logic in
  `lib/composeShareImage.ts`; all tracking-link logic in `lib/links.ts`.
- Visual system: monochrome (black/white opacity ramp) + the dish as the only
  saturated colour; load-bearing glass only over the camera. See `DESIGN.md`.
- Accessibility: best-effort — focus-visible rings on controls, ≥44px touch
  targets, the experience usable without AR, honour reduced-motion.

---

## 16. Known cleanup / next steps (the backlog any agent should know)

1. **Combo baking for AR** — merge base + add-on GLBs per combination, upload to
   R2, wire `resolveArModel()`. This makes add-ons appear in OS AR (today AR drops
   the base dish only).
2. **iOS AR** — generate USDZ per dish (and per combo); flip `USDZ_READY` in
   `data/restaurant.ts`; verify Quick Look real-scale.
3. **Real add-on GLBs** — replace the primitive placeholders; just set `modelUrl`
   on each `AddOn`.
4. **Analytics sink** — implement `sendEvent` in `lib/analytics.ts` (e.g.
   `navigator.sendBeacon` → a Workers route).
5. **Service worker / PWA** — cache-first for assets + prefetch-next (not built).
6. **Supabase data layer** — replace hardcoded `data/restaurant.ts`.
7. **Delete `src/hooks/useModelPreloader.ts`** — orphaned after the rewrite.
8. **Prod CDN domain** — move `NEXT_PUBLIC_CDN_BASE` off `*.r2.dev` to
   `cdn.menuviz.app`.
9. **`@react-three/xr`** for the v2 Android live-AR mode.

> First-task reminder for a fresh session: the diner loop (browse → customise →
> AR drop → share) is **already built and deploy-previewed**. Pick a backlog item
> above, or extend the experience — don't rebuild what exists.
