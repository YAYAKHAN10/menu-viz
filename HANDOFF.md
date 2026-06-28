# HANDOFF.md — menuviz.app

> **Purpose of this doc:** brief a fresh Claude Code session (and any human dev)
> on the _entire_ project — what we're building, why every major decision was
> made, what's in scope for v1 vs later, and exactly where to start. Read this
> once at the start of a workstream. For day-to-day rules and conventions, use
> `CLAUDE.md`.

---

## 1. The vision in one breath

People at restaurants want to _see_ what they're about to order. menuviz.app lets
a diner **scan a QR code, swipe a gorgeous menu, and see any dish rendered in AR
at true real-world scale on their own table** — from any angle, clean and
proper — then **compose a beautiful watermarked photo to post to their Stories.**

It's free for diners. It's free for restaurants in v1. We bootstrap, bleed, and
saturate one city until the flywheel is undeniable, then raise to replicate.

We are **not** trying to be first. The category is validated. We are trying to be
the **best execution** — winning on UX, speed, and a built-in viral loop — and to
become the default, the staple, the thing every cool spot has.

---

## 2. Why now / why this works (the validation)

- AR menus are a proven lever, not a gamble. Independent-operator data across
  hundreds of restaurants reports **~20–26% average-order-value uplift** within
  ~90 days, plus **~22% fewer order errors** (expectations match what arrives).
- A 2026 academic study found AR menus **increase intent to visit and intent to
  recommend** vs printed or plain QR menus — i.e. they're inherently shareable.
- WebAR (scan → browser, no app) is now the dominant delivery model for this use
  case. The friction-killer _is_ the product.

So demand and behavior are established. Our job is execution and distribution.

---

## 3. The market and our wedge

**Incumbents / competition:** dedicated AR-menu SaaS (e.g. Kabaq — photogrammetry
models, WebAR via QR, 800+ venues), object-capture + single-photo-GenAI tools
(e.g. AR Code), no-code WebAR platforms (e.g. Kivicube), and regional licensing
plays. Big brands have run AR menu activations (e.g. Pizza Hut at scale).

**The pattern:** every competitor sells _to the restaurant_ and treats the diner
experience as a means to an end.

**Our wedge:** we optimize for the **diner**, and let the diner pull us into
restaurants. The growth engine isn't a sales team — it's the **social share**.
Two consequences shape the whole build:

1. The **diner UX and load speed** must be best-in-class (it's the battleground).
2. The **watermarked share photo is customer acquisition**, so it is a
   first-class, product-critical feature — never an afterthought.

Secondary differentiator: **hero dishes are _captured_, not generic-AI-generated.**
Real food that looks real is what gets shared. Competitors leaning on single-photo
GenAI produce the generic-looking models we beat on.

---

## 4. The full product, end to end

### 4.1 Diner journey (primary)

1. **Scan** a QR on the table → opens `menuviz.app/{brand}/{location}` in the
   mobile browser. No app, no login.
2. **Swipe the feed** — a full-bleed, Stories-style vertical card feed, one dish
   per card, real photography as the poster, a single obvious **"View on my
   table"** button, and tasteful overlays (portion, ingredients, price).
3. **View in AR** — tap a dish; it appears on the real table at true scale via the
   OS-native AR viewer (Quick Look on iOS, Scene Viewer on Android). Orbit, see
   any angle, real proportions.
4. **Compose & share** — open the capture screen, frame the dish on the table,
   we composite the 3D model over the camera frame on a canvas, add a tasteful
   **menuviz watermark + the restaurant's @handle**, and one-tap export to
   Instagram / TikTok / WhatsApp Stories.
5. The shared photo seeds the next diner ("what app is that? — scan to see your
   food in 3D"). Loop closes.

### 4.2 Restaurant journey (secondary)

1. We onboard them **done-for-you**: we capture their hero dishes, generate the
   long tail, and hand them a QR table-tent + sticker. They do nothing.
2. They get a hosted, always-fresh 3D menu, higher AOV, fewer "that's not what I
   expected" complaints, and free social marketing every time a diner shares.
3. (Later) a lightweight **CMS/studio** lets multi-location brands manage menus,
   pricing, and availability per franchise.

---

## 5. AR platform strategy — explained (this is the crux)

The single most important technical reality: **iOS Safari does not support WebXR.**
This is current as of 2026 — the Safari settings flag exists but is
non-functional, confirmed on Apple's own developer forums. Markerless in-browser
world tracking (SLAM) is therefore **not freely available on iPhone** the way it
is on Android.

So we use a **barbell** that ships fast and free on both platforms:

- **Android** has native WebXR (ARCore). But we don't even need custom WebXR for
  v1: **Scene Viewer** (launched via `<model-viewer>`) already does ARCore
  markerless SLAM placement at real scale, for free, in an OS viewer.
- **iOS** uses **AR Quick Look** (USDZ) via the same `<model-viewer>` — ARKit
  markerless placement at real scale, free, OS viewer.
- **Both** get the **branded share photo via a custom canvas compositor**, which
  needs _no tracking at all_ — a frozen, composed shot doesn't require live SLAM.
  This is why the growth engine works identically on both platforms despite the
  iOS AR "downgrade."

### Why no physical marker in v1

Earlier we considered a table-tent/coaster as an AR anchor. **It's unnecessary
for placement** — both platforms place markerless. A marker only ever bought a
workaround for iOS's lack of a _custom in-page multi-object live UI_, which is a
v2 concern. v1 ships markerless and marker-free.

### What the iOS "downgrade" actually costs (and doesn't)

- **Costs (acceptable for v1):** no custom in-page UI during the live AR view;
  effectively single-object live placement; AR happens in Apple's viewer chrome.
- **Does NOT cost:** real-world scale (preserved), the share photo (custom &
  fully branded via the compositor), or the mental model (tap dish → see on table).

### The handoff seam (design carefully)

On iOS the user leaves our branded web UI to enter Quick Look, then returns. Make
the **entry and return branded and intentional** so it never feels like falling
out of the product. This seam is a known UX risk — treat it as a feature, not an
afterthought.

### Roadmap beyond v1 for AR

- **v2 — Android rich mode:** custom in-page WebXR (three.js `WebXRManager`) for
  live multi-object arrangement with our own UI inside the page.
- **v2 — iOS parity attempt:** marker-anchored **MindAR** (free, open, works in
  iOS Safari) using the table-tent/coaster as anchor to restore multi-object live
  preview + custom UI on iPhone.
- **Escape hatch (only if needed):** **Variant Launch** — a WebAR SDK that
  publishes WebXR to iOS _without per-view charges_ (you remove one line if Apple
  ever ships Safari WebXR). Sanctioned because it's not the per-view model we
  refuse. Not in v1.

---

## 6. The 3D asset pipeline — explained

The dishes must look **real and be the actual restaurant's dish** for hero items.
This is a moat and the biggest cost lever.

- **Capture (hero dishes):** photogrammetry via RealityScan (Epic) / similar.
  Build a repeatable rig (turntable + lightbox + phone). Food is finicky for
  photogrammetry (gloss, translucency, reflective sauces/glassware), so:
- **AI generation (long tail + tricky items):** prefer **self-hosted open models
  — TRELLIS / Hunyuan3D — on our own GPU** to drive marginal cost toward zero, vs
  paying per-call to Meshy/Tripo/Rodin/Luma (fine for prototyping, not for our
  cost structure at scale).
- **Optimize:** `gltf-transform` — Draco/meshopt geometry compression, KTX2/Basis
  texture compression, texture-resolution caps — to hit ≤ ~1–3 MB per model.
- **Convert:** GLB → USDZ for iOS Quick Look. **Verify real-world scale survives**
  (scale is the entire promise).
- **Publish:** GLB + USDZ + poster to Cloudflare R2; versioned `models` rows.

The hybrid (capture hero, generate tail) lets us go live per restaurant for
roughly **$0 marginal** (pure AI path) up to **~$200–600** in labor when we lovingly
capture hero dishes. Spend the labor early — showcase venues are marketing.

---

## 7. Architecture & infra — the rationale

The backend is **mostly static assets + a little config + a small CMS.** It is
not a compute problem. So:

- **Assets on Cloudflare R2 + CDN** — the decision that matters most for cost.
  R2 has **zero egress fees**; we serve millions of 3D-model downloads for free,
  where S3 egress would quietly bleed us to death.
- **Supabase** for menu data, auth, and the restaurant CMS — fast to build, real
  Postgres, generous. **Never** put the heavy binaries here.
- **Frontend** on Cloudflare Pages / Vercel; **edge functions** for the few
  dynamic endpoints. **No bespoke AWS Lambda/EC2** — it adds ops drag for a small
  team optimizing for speed, with no benefit at our shape.
- **PWA + service worker**: cache-first for assets, prefetch next dish → a re-scan
  is instant, and everything tolerates bad/absent restaurant Wi-Fi over cellular.
- **No on-prem hardware / local network device.** It adds cost, install labor,
  and a failure point for zero AR benefit (AR renders on the diner's phone
  regardless). The fix for weak signal is smaller assets + CDN, not a box.

---

## 8. Performance philosophy

Speed _is_ the UX. A beautiful feed that takes 9 seconds loses to a plain one
that takes 2. Hard budgets live in `CLAUDE.md §7`. The feed is the shared front
door and the home of the "win on UX" thesis — it must be genuinely beautiful and
render in **under 3 seconds**, with AR as the payoff, never the gate.

---

## 9. v1 scope

### Must-have (v1 ships with all of these)

- Zero-install PWA; QR → `menuviz.app/{brand}/{location}`; works on iOS Safari
  **and** Android Chrome.
- Beautiful, swipe-native 2D card feed (home base on both platforms).
- Real-scale AR per dish via `<model-viewer>` (Quick Look on iOS, Scene Viewer on
  Android).
- **Branded canvas compositor** for the share photo — identical on both
  platforms, watermark + restaurant handle, export to IG/TikTok/WhatsApp.
- Per-location routing (menu/pricing/availability + analytics per franchise).
- Asset pipeline producing optimized GLB + USDZ under budget.
- Full funnel analytics (scan → … → share), north-star = **share rate**.
- Cellular-tolerant, cache-first, prefetching.

### Explicitly OUT of scope for v1 (don't build yet)

- Custom in-page WebXR on Android (multi-object live arrangement UI).
- Marker-anchored MindAR on iOS.
- Variant Launch integration.
- Restaurant self-serve CMS/studio (start with internal/done-for-you tooling).
- Ordering / payments (we are visualization, not POS — integrate later if ever).
- Accounts/login for diners (there are none by design).
- Native apps.

### Roadmap after v1

- v2: Android rich WebXR mode; iOS marker mode for parity; restaurant CMS;
  multi-dish "full table setting" composed USDZ scenes; loyalty/return hooks.
- v3: investor-funded replication across cities; deeper brand integrations.

---

## 10. Success metrics

- **North star: share rate** (shares ÷ sessions) — the viral coefficient.
- Supporting: scans per table per week; AR-enter rate; capture rate; restaurant
  retention at 60/90 days; per-venue model-production cost trending down.
- Business proof we're building toward: a working flywheel in one beachhead city
  (e.g. 50–100 retained venues + organic diner growth from social), which is the
  fundable story. If it blows up (inbound demand outpaces capture capacity),
  raise immediately on momentum.

---

## 11. Non-negotiables (quick reference)

**Must-haves:** zero-install; true real-world scale; sub-3s feed; best-in-class
swipe UI; one-tap branded share on both platforms; done-for-you onboarding;
cellular-tolerant.

**Must-not-haves:** forced app install; Wi-Fi/hardware dependence; per-view AR
SDK; S3 egress as CDN; generic AI for hero dishes; bespoke AWS plumbing;
charging restaurants in v1; spreading thin across cities before saturating one.

---

## 12. Open decisions (resolve early, flag in CLAUDE.md once chosen)

1. **Next.js vs Vite SPA.** Recommendation: **Next.js (App Router)** for
   per-location menu SEO + fast first paint. Override to Vite only if SEO is
   deprioritized. _Decision needed before scaffold._
2. **Cloudflare Pages vs Vercel** for hosting. Either works; Cloudflare keeps
   asset + app + edge under one roof.
3. **Service worker tooling** (Workbox vs framework PWA plugin).
4. **Analytics implementation** (self-hosted lightweight vs a privacy-first
   vendor) — must not slow first paint.
5. **GPU for self-hosted 3D gen** (rented vs in-house workstation) — affects
   pipeline timeline, not app code.
6. **Short-link scheme** for physical QRs (`/{brand}/{location}` vs `/r/{code}`).

---

## 13. First milestones (suggested order for the Claude Code session)

> Goal: prove the full diner loop end-to-end with one hardcoded restaurant before
> building breadth.

1. **Scaffold** `apps/web` (chosen framework), TypeScript strict, lint/test,
   Supabase + R2 clients, env wiring. One throwaway hardcoded menu (e.g. "KFC")
   served from `menuviz.app/kfc`.
2. **Feed first.** Build the beautiful swipe card feed with real poster images and
   placeholder data. Hit the sub-3s budget. This is the product's face — make it
   excellent before anything else.
3. **AR launch.** Drop in `@google/model-viewer` behind an `ARProvider`
   abstraction; one real optimized GLB + USDZ; confirm real-scale placement on a
   physical iPhone (Quick Look) and Android (Scene Viewer). Get the iOS
   entry/return seam branded.
4. **Capture + share.** Build the canvas compositor: camera frame + GLB render +
   watermark + restaurant handle + native share sheet. Verify it works in iOS
   Safari. **This is the growth engine — give it real care.**
5. **Pipeline v0.** Script: optimize a GLB with `gltf-transform`, convert to USDZ,
   verify scale, upload to R2, write the `models` row. Make producing dish #2 fast.
6. **Data + routing.** Replace hardcoded menu with Supabase-backed brand/location
   model; implement per-location routing + the events funnel (scan → share).
7. **Harden.** Service worker cache-first + prefetch-next; cellular testing;
   reduced-motion + no-AR orbit fallback; analytics dashboards for share rate.

Only after the loop is proven and instrumented do we widen to more dishes,
venues, and the v2 AR enhancements.

---

## 14. Context links (for the team, not the app)

- Business/strategy rationale and competitive detail were worked out in planning
  conversations; the distilled decisions all live in this doc and `CLAUDE.md`.
  If a decision here seems arbitrary, it isn't — check §3/§5/§7 for the reasoning
  before changing it.
