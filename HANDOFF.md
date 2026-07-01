# HANDOFF.md — menuviz.app

> **Purpose:** brief a fresh Claude Code session (and any human dev) on the
> _entire_ project — what we're building, why every major decision was made,
> **what is actually built today**, and what's next. Read this once at the start
> of a workstream. For the codebase map and day-to-day rules, use `CLAUDE.md`.
>
> Last full sync: **2026-07-01** (branch `refactor/frontend`).

---

## 0. Where the project is right now (read first)

The diner experience was **reworked into a camera-free, design-led 3D menu** on
branch `refactor/frontend`. The loop:

> **scan → browse the 3D dish menu → step/swipe between dishes → customise →
> (Android) drop on your table in AR → share a branded photo.**

What exists today:

- A **camera-free, single-screen** diner experience (`MenuShell` → `MenuStage`):
  the dish renders as **live react-three-fiber 3D** over a **warm "horizon"
  gradient backdrop + film grain**. The **live camera was removed** for the MVP
  (the AR flow was unreliable); AR is now a per-dish button, not the home base.
- A **Dimension design system**: near-monochrome dark, glassmorphic surfaces,
  pill geometry, hairline borders, **DM Sans** (whisper-weight display) + **Geist**
  (UI / tabular numbers), tokenised in `globals.css`
  (`void / char / ink / fog / mist / ash / bone / paper`). The dish is the only
  saturated colour.
- A **bottom-sheet "Full menu"** (`MenuDrawer`): a scannable editorial list with a
  sticky **scroll-spy category bar** (a sliding active pill), bold section headers
  - counts, and rich rows (monochrome thumbnail well, name, descriptor, highlight
    tag, price). It opens from a "Full menu" pill that **morphs into the sheet**.
- **Container morphs** everywhere via the **View Transitions API**
  (`lib/viewTransition.ts` + scoped CSS in `globals.css`): the menu pill ↔ sheet,
  the dish **card ↔ its customise options**, and a **cinematic directional slide**
  of the 3D dish when you step between dishes.
- **Dish navigation**: bolder edge chevrons + a tappable **segment position
  track**, plus swipe; each move triggers the directional slide.
- **Customise**: a button on the price line opens variant/add-on chips inline (the
  card morphs open) with live price roll-up. Still single-select **versions** +
  additive **add-ons**, each its own tray model (primitive placeholders for now).
- **AR (Android Scene Viewer)**, the **combo-baking pipeline**, and the **branded
  share compositor** are unchanged and still wired (`lib/ar.ts`,
  `scripts/bake-combos.ts`, `lib/composeShareImage.ts` — now composes over the
  branded backdrop, no camera frame). Two optimised models on R2, per-branch
  menus, QR tracking links, and the gltf-transform pipeline are unchanged.
- A **Brim** demo logo at the top of the page (`public/images/brim-logo.png`) and
  **react-grab** as a dev-only "grab a UI element for the agent" tool.

What is **not** done yet (the backlog): component GLBs for the combo baker, iOS
AR (USDZ), the analytics sink, a service worker, the Supabase data layer, and a
**transparent-background Brim logo** (the supplied PNG has a baked light→dark
gradient). Details in §9 and `CLAUDE.md §16`.

> **Architecture note for anyone holding the old mental model:** there is **no
> live camera** anymore and **no `<model-viewer>`**. Home base is a camera-free 3D
> product-viewer stage; the full menu is a bottom sheet; transitions use the
> **View Transitions API**. Heads-up: `CLAUDE.md`, `DESIGN.md`, `PRODUCT.md`, and
> `README.md` still describe the older camera-first / "quiet instrument"
> monochrome design and are **stale** pending a rewrite. See §5.

---

## 1. The vision in one breath

People at restaurants want to _see_ what they're about to order. menuviz.app lets
a diner **scan a QR code, browse a gorgeous 3D menu over their camera, customise a
dish, and see it in AR at true real-world scale on their own table** — then
**compose a beautiful watermarked photo to post to their Stories.**

Free for diners. Free for restaurants in v1. We bootstrap and saturate one city
until the flywheel is undeniable, then raise to replicate.

We are **not** trying to be first — the category is validated. We are trying to be
the **best execution**, winning on UX, speed, and a built-in viral loop.

---

## 2. Why now / why this works (the validation)

- AR menus are a proven lever: independent-operator data reports **~20–26% AOV
  uplift** in ~90 days and **~22% fewer order errors**.
- A 2026 study found AR menus **increase intent to visit and to recommend** vs
  printed/plain-QR menus — i.e. inherently shareable.
- WebAR (scan → browser, no app) is the dominant delivery model. The
  friction-killer _is_ the product.

Demand and behaviour are established. Our job is execution and distribution.

---

## 3. The market and our wedge

**Incumbents:** dedicated AR-menu SaaS (e.g. Kabaq — photogrammetry, WebAR via QR),
object-capture + single-photo-GenAI tools (e.g. AR Code), no-code WebAR platforms
(e.g. Kivicube). Big brands have run AR menu activations.

**The pattern:** every competitor sells _to the restaurant_ and treats the diner
experience as a means to an end.

**Our wedge:** optimise for the **diner**, and let the diner pull us into
restaurants. The growth engine isn't a sales team — it's the **social share**. Two
consequences shape the whole build:

1. The **diner UX and load speed** must be best-in-class (the battleground).
2. The **watermarked share photo is customer acquisition** — a first-class,
   product-critical feature, never an afterthought.

Secondary differentiator: **hero dishes are _captured_, not generic-AI-generated.**
Real food that looks real is what gets shared.

---

## 4. The full product, end to end

### 4.1 Diner journey (primary) — as built

1. **Scan** a QR on the table → opens `menuviz.app/restaurants/{brand}?branch={loc}`
   in the mobile browser. No app, no login. The link carries `?src=` (campaign)
   and optional `?d=` (deep-link a specific dish).
2. **Browse** — a camera-first single screen. The current dish renders as **live
   3D over the camera feed**. A **centered, swipeable category strip** sits on top
   (tap or swipe to switch category); **swipe left/right** moves between items;
   **drag** rotates the dish.
3. **Customise** — **tap the dish** to open the configurator. Pick a **version**
   (single-select variant group, e.g. fries vs mashed potato) and toggle additive
   **add-ons** (drink, extra cheese, …). Each chosen item appears as its **own
   model on the tray** in real time, and the price rolls up live.
4. **Drop in AR** — **"View on my table"** launches the OS AR viewer (Scene Viewer
   on Android today) and places the dish at **true real-world scale** on the table.
   When a baked combo exists for the chosen version it drops the **composed plate**;
   otherwise (today) it drops the base dish. See §5.
5. **Compose & share** — **"Share a photo"** snapshots the configured plate from
   the WebGL canvas, composites it over the camera frame with a **menuviz
   watermark + dish/price**, and opens the native share sheet (IG/TikTok/WhatsApp).
6. The shared photo seeds the next diner. Loop closes.

> Per the AR constraint (§5), customisation and item-swiping happen in **our** UI;
> AR drops the **finished** plate. This "browse-and-drop" model works on iPhone and
> Android. Live toggling _inside_ an AR session is a v2 (Android WebXR) idea.

### 4.2 Restaurant journey (secondary)

1. **Done-for-you onboarding:** we capture hero dishes, generate the long tail, and
   hand them a QR table-tent + sticker. They do nothing.
2. They get a hosted, always-fresh 3D menu, higher AOV, fewer "that's not what I
   expected" complaints, and free social marketing on every share.
3. (Later) a lightweight CMS/studio for multi-location brands. The data model
   already supports **per-branch menus, pricing, and availability** (§ data model
   in `CLAUDE.md`), and `/links` generates a trackable QR per branch and per dish.

---

## 5. AR + 3D strategy — explained (this is the crux)

The single most important technical reality: **iOS Safari does not support WebXR**
(current as of 2026; the Safari flag is non-functional). Markerless in-browser SLAM
is therefore not freely available on iPhone the way it is on Android.

A second, equally important reality drove our architecture: **the OS AR viewers
(Android Scene Viewer, iOS Quick Look) are single-object viewers that display one
pre-baked file from a URL.** You cannot toggle add-ons or change items _inside_
them. So:

### The two layers

- **Live preview = ours (react-three-fiber).** To show multiple toggleable add-on
  models at once, the preview is our own three.js scene (`DishStage`), not
  `<model-viewer>` (which is single-model). This is where browse + customise +
  rotate happen, on both platforms.
- **OS AR drop = the native viewers, launched directly.** `lib/ar.ts` launches
  **Scene Viewer** on Android via an ARCore `intent://` (with `resizable=false`
  for fixed real-world scale) and **Quick Look** on iOS via a `rel="ar"` anchor.
  We dropped `<model-viewer>` entirely — Scene Viewer's intent is Google's own
  documented launch, and one 3D engine (R3F) is cleaner.
- **Branded share photo = a custom canvas compositor** (`composeShareImage.ts`),
  which needs **no tracking at all** — a composed shot doesn't require live SLAM.
  This is why the growth engine works identically on both platforms despite the
  iOS AR limits.

### Variants in AR → pre-baked combinations ("browse-and-drop") — pipeline built

Because OS AR takes one file, each component (side/add-on) is authored as its
**own GLB**, and the chosen **combination** is pre-baked into a single GLB in the
pipeline and served from R2. The diner configures in our UI; AR drops the finished
plate. This is **built**: `scripts/bake-combos.ts` composes the base dish + chosen
variant onto the ground at true meters and Draco/JPEG-optimises it; `lib/combo.ts`
defines the deterministic combo key shared by baker and runtime;
`lib/combos.generated.ts` is the generated manifest of baked keys; and
`resolveArModel(dish, variantSelection, platform)` in `lib/ar.ts` maps the
selection → the baked combo URL when its key is in the manifest, else the base
dish.

Two deliberate scoping calls (revisit when real assets land):

- **Variants only.** The baker bakes one combo per version (the side); additive
  add-ons don't change the baked combo. Widen by extending `comboKey` + the
  baker's enumeration together.
- **Android/GLB only.** No GLB→USDZ converter is wired, so iOS Quick Look uses the
  base-dish USDZ; combos aren't generated for iOS.

**Today it falls back to the base dish** for everyone, because the side/add-on
**component GLBs don't exist yet** (they're primitives in the preview) — so the
manifest is empty. Drop a real GLB at `public/models/components/<optionId>.glb`,
run `bun run bake:combos` then `bun run assets:sync`, and AR serves the combo with
**no code changes**. Nothing fake (primitive boxes) is ever baked or shipped.

### Real-world scale is the product

GLBs are authored in **meters** (the pipeline's `normalize-scale.ts` enforces this;
burger ≈ 0.12 m, chicken ≈ 0.15 m), and AR launches with fixed scale so the dish
lands the right size on the table. Verify scale survives every conversion.

### Compression must be Scene Viewer-safe

Compress geometry with **Draco** and textures as **JPEG/KTX2** — **not** meshopt /
WebP. meshopt + webp render in our in-page viewer but can break Scene Viewer
placement. (See `CLAUDE.md §8` for the exact recipe.)

### Roadmap beyond v1 for AR

- **v2 — Android live AR:** custom in-page WebXR (`@react-three/xr` /
  `WebXRManager`) for live multi-object arrangement + add-on toggling **inside**
  the AR session. Android-only.
- **v2 — iOS parity:** marker-anchored MindAR (table tent as anchor) for rich live
  AR on iPhone, if we want it. Browse-and-drop doesn't need it.
- **Escape hatch (only if needed):** Variant Launch — WebAR to iOS without
  per-view charges. Sanctioned because it isn't the per-view model we refuse.

---

## 6. The 3D asset pipeline — built and proven

Hero dishes must look **real and be the actual restaurant's dish** — a moat and the
biggest cost lever. The pipeline exists today (`scripts/` + `gltf-transform`) and
produced the two demo models from raw Meshy/Tripo exports.

- **Capture (hero):** photogrammetry (RealityScan / similar). Food is finicky
  (gloss, translucency), so —
- **AI generation (long tail / tricky):** prefer **self-hosted open models
  (TRELLIS / Hunyuan3D)** over per-call APIs to drive marginal cost to ~zero.
- **Prep:** raw exports are often broken — e.g. the Meshy chicken shipped
  POSITION-only (no normals/material). `prep-chicken.ts` welds, computes normals,
  and assigns a PBR material. Generalise per-source as needed.
- **Normalise scale:** `normalize-scale.ts` scales to real-world meters **before**
  optimisation.
- **Optimise:** `gltf-transform optimize` — **Draco** geometry + **JPEG** textures
  (Scene Viewer-safe), simplify, texture cap ≤ 1K → **≤ ~1–3 MB** (current models:
  1.21 MB / 748 KB). Validate + inspect the bbox.
- **Convert (iOS):** GLB → USDZ for Quick Look; verify scale survives. **Not done
  yet** → `USDZ_READY=false`.
- **Publish:** `bun run assets:sync` uploads to **Cloudflare R2** with correct
  content-types and prunes stale objects (now covers `models/dishes/` **and**
  `models/combos/`).
- **Combo baking (built):** `bun run bake:combos` composes base dish + chosen
  variant component(s) into one real-scale GLB per combo (see §5 and
  `CLAUDE.md §8`). Waiting on component GLBs to actually emit anything.
- **Next:** author the **component GLBs** (sides/add-ons), then USDZ generation
  for iOS (dishes and combos).

The hybrid (capture hero, generate tail) lets us go live per restaurant for roughly
**$0 marginal** (pure AI) up to **~$200–600** in labour for lovingly-captured hero
dishes. Spend the labour early — showcase venues are marketing.

---

## 7. Architecture & infra — the rationale

The backend is **mostly static assets + a little config + a small CMS.** Not a
compute problem. So:

- **Assets on Cloudflare R2 + CDN** — the decision that matters most for cost. R2
  has **zero egress**; we serve millions of model downloads for free where S3
  egress would bleed us. (Models live in `public/models/dishes/` as the local
  source-of-truth and on R2 for delivery; the app resolves via
  `NEXT_PUBLIC_CDN_BASE`.)
- **Frontend on Cloudflare Workers** (SSR via OpenNext). No bespoke AWS.
- **Supabase** (planned) for menu data, auth, and the CMS — fast, real Postgres.
  **Not yet wired**; data is hardcoded in `data/restaurant.ts`. Never put heavy
  binaries here.
- **PWA + service worker** (planned): cache-first for assets, prefetch next dish →
  instant re-scan, tolerant of bad/absent restaurant Wi-Fi over cellular.
- **No on-prem hardware.** AR renders on the diner's phone regardless; the fix for
  weak signal is smaller assets + CDN, not a box.

---

## 8. Performance philosophy

Speed _is_ the UX. A beautiful menu that takes 9 seconds loses to a plain one that
takes 2. Hard budgets live in `CLAUDE.md §10`. The browse stage is the shared front
door — it must be genuinely beautiful and render in **under 3 seconds**, with AR as
the payoff, never the gate. Honour `prefers-reduced-motion`.

---

## 9. v1 scope — what's done vs pending

### Shipped (built and deploy-previewed)

- ✅ Zero-install PWA; QR → `menuviz.app/restaurants/{brand}?branch={loc}`; iOS
  Safari + Android Chrome.
- ✅ Camera-first single-screen 3D browse (centered swipeable category strip,
  swipe, rotate, clean dark stage until camera-live).
- ✅ Live configurator: single-select **versions** (variant groups) + additive
  **add-ons**, separate model per chosen item, price roll-up.
- ✅ Real-scale AR on Android (Scene Viewer intent).
- ✅ **Combo-baking pipeline** (`bake:combos`) + AR seam wiring (variant-only,
  Android/GLB) — built and verified; emits combos once component GLBs exist.
- ✅ Branded canvas compositor for the share photo (both platforms).
- ✅ Per-location routing + per-branch menus/pricing/availability.
- ✅ Dynamic QR tracking links per branch + per dish (`/links`).
- ✅ Asset pipeline producing optimised, Scene-Viewer-safe GLBs; R2 deploy.
- ✅ Funnel analytics events (north-star = share rate) — through the `sendEvent`
  seam.

### Pending for a complete v1

- ⏳ **Component GLBs** for sides/add-ons → unblocks baked combos in AR (pipeline
  is done; just needs assets + `bake:combos` + `assets:sync`).
- ⏳ **iOS AR** (generate USDZ for dishes **and** combos; flip `USDZ_READY`).
- ⏳ **Real add-on/side models** (primitive placeholders in the preview today).
- ⏳ **Analytics sink** (`sendEvent` is a no-op; pick a privacy-light pipeline).
- ⏳ **Service worker / PWA** caching + prefetch.
- ⏳ **Supabase data layer** (hardcoded today).
- ⏳ **Prod CDN domain** (`cdn.menuviz.app` instead of `*.r2.dev`).

### Explicitly OUT of scope for v1

- Custom in-page WebXR live-AR (Android multi-object) — v2.
- Marker-anchored MindAR on iOS — v2.
- Variant Launch.
- Restaurant self-serve CMS/studio (done-for-you tooling first).
- Ordering / payments (we are visualisation, not POS).
- Diner accounts/login (none by design). Native apps.

### Roadmap after v1

- v2: Android live WebXR mode; iOS marker mode; restaurant CMS; multi-dish "full
  table setting" composed scenes; loyalty/return hooks.
- v3: investor-funded replication across cities; deeper brand integrations.

---

## 10. Success metrics

- **North star: share rate** (shares ÷ sessions) — the viral coefficient.
- Supporting: scans/table/week; AR-enter rate; capture rate; restaurant retention
  at 60/90 days; per-venue model-production cost trending down.
- Business proof we're building toward: a working flywheel in one beachhead city
  (≈50–100 retained venues + organic diner growth from social) — the fundable
  story. If inbound outpaces capture capacity, raise on momentum.

---

## 11. Non-negotiables (quick reference)

**Must-haves:** zero-install; true real-world scale; sub-3s first render;
best-in-class browse/customise UX; one-tap branded share on both platforms;
done-for-you onboarding; cellular-tolerant.

**Must-not-haves:** forced app install; Wi-Fi/hardware dependence; per-view AR SDK;
S3 egress as CDN; generic AI for hero dishes; **meshopt/webp for AR models**;
`<model-viewer>` back in the preview; bespoke AWS plumbing; charging restaurants in
v1; spreading thin across cities before saturating one.

---

## 12. Decisions resolved (full list in `CLAUDE.md §9a`)

1. ✅ **Next.js (App Router)** + **bun** (strict).
2. ✅ **Cloudflare Workers** (SSR via OpenNext). Not Pages, not Vercel. (A Vercel
   integration auto-deploys PRs but its previews are auth-gated — use the Worker
   preview.)
3. ✅ **react-three-fiber** for the live preview; **direct Scene Viewer / Quick
   Look** for AR (`lib/ar.ts`); `model-viewer` removed.
4. ✅ **Draco + JPEG** for AR-bound models (Scene Viewer compatibility).
5. ✅ **R2 + CDN** for assets (zero egress).
6. ✅ **Combo baking = variants-only, Android/GLB-only** for now (the side is the
   "version"; add-ons don't change the baked file; iOS combos await a USDZ
   converter). The scheme widens by extending `lib/combo.ts` + the baker together.

**Still open:** service-worker tooling; analytics sink; USDZ generation approach
(dishes **and** combos); Supabase data layer; short-link scheme
(`/{brand}/{location}` vs `/r/{code}`); add-on permutations in baked combos.

---

## 13. How to get oriented fast (for a new session)

1. Read **`CLAUDE.md`** — it has the full codebase map (every file), the data
   model, the AR seam, the pipeline commands (with the `LD_LIBRARY_PATH`/sharp
   gotcha), the analytics events, and the backlog.
2. Run it: `bun run dev`, open `/` (the default "Stacked" store), `/links` (the QR
   board), `/restaurants/stacked?branch=airport-express` (a burger-only branch).
3. The diner loop already works end-to-end and the **combo-baking pipeline is
   built** — **pick a backlog item** (`CLAUDE.md §16`) rather than rebuilding what
   exists. The highest-value next step is **authoring the side/add-on component
   GLBs** (drop them in `public/models/components/`, run `bun run bake:combos` +
   `assets:sync` to light up combos in AR), then **USDZ for iOS AR**.

---

## 14. Context note

The business/strategy rationale was worked out in planning conversations; the
distilled decisions live in this doc and `CLAUDE.md`. If a decision here seems
arbitrary, it isn't — check §3 / §5 / §7 for the reasoning before changing it.
