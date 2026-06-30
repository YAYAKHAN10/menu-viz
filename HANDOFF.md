# HANDOFF.md — menuviz.app

> **Purpose:** brief a fresh Claude Code session (and any human dev) on the
> _entire_ project — what we're building, why every major decision was made,
> **what is actually built today**, and what's next. Read this once at the start
> of a workstream. For the codebase map and day-to-day rules, use `CLAUDE.md`.
>
> Last full sync: **2026-06-30**.

---

## 0. Where the project is right now (read first)

The **core diner loop is built, working, and deploy-previewed** on a Cloudflare
Worker:

> **scan → browse a live 3D menu over the camera → customise a dish with add-ons
> → drop it on your table in AR (Android) → share a branded photo.**

What exists today:

- A **camera-first, single-screen** diner experience (category strip, swipe
  between items, drag-to-rotate, tap-to-customise) built on **react-three-fiber**.
- A **live add-on configurator** — each add-on is its own model toggled on the
  tray (primitive placeholders until real GLBs land), with live price roll-up.
- **Android AR** via Scene Viewer (ARCore intent) at **true real-world scale**;
  **iOS** wired for Quick Look but off until USDZ assets exist.
- The **branded share-photo compositor** (works on both platforms, no SLAM).
- **Two real optimised models** (beef burger, crispy chicken) deployed to R2.
- **Per-branch menus** (availability + pricing) and **dynamic QR tracking links**.
- The full **3D asset pipeline** (gltf-transform) + R2 sync tooling.

What is **not** done yet (the backlog): add-ons inside AR (needs pre-baked combo
files), iOS AR (needs USDZ), real add-on GLBs, the analytics sink, a service
worker, and the Supabase data layer. Details in §9 and `CLAUDE.md §16`.

> **Architecture note for anyone holding the old mental model:** we no longer use
> `<model-viewer>`, and the UI is no longer a vertical "Stories card feed." The
> preview is our own react-three-fiber scene (so add-ons can toggle live), AR
> launches the OS viewers directly, and the home base is a camera-first 3D stage.
> See §5.

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
   3D over the camera feed**. A **category strip** sits on top; **swipe left/right**
   moves between items; **drag** rotates the dish.
3. **Customise** — **tap the dish** to open the configurator and toggle add-ons
   (fries, drink, extra cheese, …). Each add-on appears as its **own model on the
   tray** in real time, and the price rolls up live.
4. **Drop in AR** — **"View on my table"** launches the OS AR viewer (Scene Viewer
   on Android today) and places the dish at **true real-world scale** on the table.
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

### Add-ons in AR → pre-baked combinations ("browse-and-drop")

Because OS AR takes one file, each add-on is authored as its **own GLB**, and the
chosen **combination** is pre-baked into a single GLB (+ USDZ) in the pipeline and
served from R2. The diner configures in our UI; AR drops the finished plate.
`resolveArModel()` in `lib/ar.ts` is the seam that maps a selected add-on set →
its baked combo URL. **Today it returns the base dish** (combos not baked yet).

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
  content-types and prunes stale objects.
- **Next:** **combo baking** — merge base + add-on GLBs per combination for AR.

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
- ✅ Camera-first single-screen 3D browse (category strip, swipe, rotate).
- ✅ Live add-on configurator (separate model per add-on, price roll-up).
- ✅ Real-scale AR on Android (Scene Viewer intent).
- ✅ Branded canvas compositor for the share photo (both platforms).
- ✅ Per-location routing + per-branch menus/pricing/availability.
- ✅ Dynamic QR tracking links per branch + per dish (`/links`).
- ✅ Asset pipeline producing optimised, Scene-Viewer-safe GLBs; R2 deploy.
- ✅ Funnel analytics events (north-star = share rate) — through the `sendEvent`
  seam.

### Pending for a complete v1

- ⏳ **Add-ons in AR** (pre-baked combo GLB/USDZ; `resolveArModel` seam).
- ⏳ **iOS AR** (generate USDZ; flip `USDZ_READY`).
- ⏳ **Real add-on GLBs** (placeholders today).
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

**Still open:** service-worker tooling; analytics sink; USDZ generation approach;
Supabase data layer; short-link scheme (`/{brand}/{location}` vs `/r/{code}`).

---

## 13. How to get oriented fast (for a new session)

1. Read **`CLAUDE.md`** — it has the full codebase map (every file), the data
   model, the AR seam, the pipeline commands (with the `LD_LIBRARY_PATH`/sharp
   gotcha), the analytics events, and the backlog.
2. Run it: `bun run dev`, open `/` (the default "Stacked" store), `/links` (the QR
   board), `/restaurants/stacked?branch=airport-express` (a burger-only branch).
3. The diner loop already works end-to-end — **pick a backlog item** (`CLAUDE.md
§16`) rather than rebuilding what exists. The highest-value next step is
   **combo baking so add-ons appear in AR**, then **USDZ for iOS AR**.

---

## 14. Context note

The business/strategy rationale was worked out in planning conversations; the
distilled decisions live in this doc and `CLAUDE.md`. If a decision here seems
arbitrary, it isn't — check §3 / §5 / §7 for the reasoning before changing it.
