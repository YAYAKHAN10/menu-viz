# Product

## Register

product

## Users

**Diner (primary).** Sitting at a restaurant table, hungry, phone in hand,
having just scanned a QR code. No app installed, often on cellular, frequently on
a mid-tier Android or older iPhone. They want to decide what to order — fast —
and the moment of delight is seeing a dish appear at true scale on their own
table in AR, then sharing that shot. Zero patience for friction, sign-ups, or
slow loads. Job to be done: _browse the menu, see what the food actually looks
like, decide, and (sometimes) share a great photo of it._

**Restaurant (secondary).** Gets a QR code and a hosted 3D menu, done-for-you.
Not a power user; never touches the diner UI. Cares that it looks premium and
that it drives orders. Out of scope for the diner-facing surface this document
governs.

## Product Purpose

menuviz.app is a zero-install PWA that turns a restaurant menu into an
interactive, AR-capable experience: scan → swipe a card feed → view any dish in
AR at real-world scale → compose a branded, watermarked photo to share. The
product is the marketing — every shared photo is an ad, so the diner experience
must be beautiful enough that people _want_ to post it. Success is **share rate**
(shares ÷ sessions): the viral loop is the business model. We compete on UX,
speed, and virality, not on being first. The category is validated (AR menus
report a ~20–26% lift in average order value).

## Brand Personality

**Sleek, modern, tech-forward.** The AR/3D capability is the headline; the
interface should feel like a premium, confident piece of technology that happens
to be about food. Crisp, fast, and quietly futuristic — never gimmicky. Motion
and depth signal capability; restraint keeps the dish (not the chrome) as the
hero. Voice is concise and assured: it shows rather than tells, and never
over-explains. The food photography and the live 3D models carry the warmth; the
UI carries the precision.

## Anti-references

This must NOT look like any of the following:

- **Generic AI cream/beige.** The current `#f7f3ec` warm-cream body and the
  `--paper`/`--sand`/`--parchment` family is the saturated 2026 AI default.
  Identity is not carried by a warm near-white neutral.
- **Cluttered delivery-app UI** (Uber Eats / DoorDash). No dense scrolling lists,
  upsell badges, promo noise, or interchangeable photo-grid sameness.
- **Skeuomorphic / clip-art food.** No kitschy faux-3D CSS plates or illustrated
  food standing in for the real thing. Real capture (photogrammetry) and real
  photography are the assets; cartoon plates are a placeholder to retire.
- **Corporate SaaS dashboard.** No sterile gray, chart-and-card enterprise
  sameness. Wrong emotional register for food.

## Design Principles

1. **The feed is home base; AR is a drill-in.** The 2D swipeable card feed is the
   center of gravity on every platform. AR is a per-dish entry, never the gate.
   Everything must work without AR (orbit-only fallback).
2. **The dish is the hero, the UI is the frame.** Chrome recedes; food (real
   photography, real 3D) commands attention. Precision and depth in the UI exist
   to make the dish look better, not to be noticed themselves.
3. **Real scale, real food, no fakery.** True real-world scale is the core
   promise and survives every path. Hero dishes are captured, not AI-faked;
   placeholder cartoon plates are debt, not design.
4. **Speed is a feature you can feel.** < 3s to first feed render on mid-tier
   mobile + 4G. Lazy-load per dish, prefetch the next, cache-first. Assume
   hostile restaurant Wi-Fi; design for cellular.
5. **Every screen is a potential ad.** The share artifact is the growth engine,
   so the whole experience must be screenshot-worthy and the branded capture flow
   must feel intentional and identical on iOS and Android.

## Accessibility & Inclusion

Best-effort, ship-fast — not a formal WCAG target for v1, but don't regress on
fundamentals: legible contrast for body text, semantic markup, the feed fully
usable without AR (orbit-only fallback already a principle), and honor
`prefers-reduced-motion` given how motion-heavy the experience is. Revisit a
formal AA pass post-v1.
