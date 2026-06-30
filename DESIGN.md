---
name: MenuViz
description: A quiet, instrument-grade dark-glass menu that floats over the diner's real table.
colors:
  surface: "#000000"
  ink: "#ffffff"
  ink-muted: "#ffffffa3"
  ink-faint: "#ffffff7a"
  ink-ghost: "#ffffff52"
  glass-dark: "#0000003d"
  glass-light: "#ffffff14"
  hairline: "#ffffff29"
  hairline-faint: "#ffffff1f"
  accent: "#86a85d"
  scrim-top: "#00000094"
  scrim-bottom: "#000000c2"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.16em"
  micro:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.65rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.20em"
rounded:
  tile: "1rem"
  panel: "1.5rem"
  card: "1.75rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "2rem"
components:
  pill:
    backgroundColor: "{colors.glass-dark}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0.5rem 1rem"
  nav-button:
    backgroundColor: "{colors.glass-dark}"
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.full}"
    height: "2.75rem"
    width: "2.75rem"
  info-panel:
    backgroundColor: "{colors.glass-dark}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "1rem"
  stat-tile:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "0.75rem"
---

# Design System: MenuViz

## 1. Overview

**Creative North Star: "The Quiet Instrument"**

MenuViz is a tool that disappears. A diner scans a QR code and the menu is just
_there_ — floating over a live view of their own table — with no splash screen,
no takeover, nothing demanding attention. The interface is a precision instrument
held lightly: dark glass readouts, hairline rings, and tracked micro-labels that
frame the food without competing with it. Every pixel of chrome is in service of
one question — _what does this dish look like on my table?_ — and then it gets out
of the way. The flashiness lives in the 3D dish and the AR moment, never in the UI.

The palette is disciplined to the point of austerity: a black (or live-camera)
surface, a single white-with-opacity text ramp, and exactly one color that is
allowed to be saturated — the dish itself, whose accent is injected per item from
its 3D model. This is the system's whole personality: **monochrome instrument,
living dish.** Depth comes almost entirely from frosted glass and hairline
borders, not from shadow theatrics or gradients.

This system explicitly rejects the things PRODUCT.md names: the generic AI
cream/beige body (there is no warm near-white anywhere — the surface is black or
the real world), the cluttered delivery-app grid of badges and upsell noise, the
kitschy skeuomorphic clip-art plate (a fallback being retired, never the design),
and the sterile gray SaaS dashboard. It also rejects its own worst temptation:
glassmorphism for decoration. Glass here is load-bearing legibility, not garnish.

**Key Characteristics:**

- Minimal and frictionless: scan → it works → it recedes. No screen takeovers.
- Monochrome surface; the dish is the only saturated color on screen.
- Depth via frosted glass + hairline borders, not heavy shadow or gradient.
- Tracked uppercase micro-labels as the system's structural voice.
- Fully circular AR stage and pill controls — a soft, instrument-like geometry.

## 2. Colors

A near-monochrome system: a black or live-camera surface, one white opacity ramp
for all text and chrome, and a single dynamic accent that belongs to the food.

### Primary

- **Living Accent** (`#86a85d`, dynamic per dish): The _only_ saturated color on
  screen, injected at runtime from each dish's `modelColors.accent` via the
  `--model-accent` custom property. It tints the AR stage glow and dish framing.
  The hex in frontmatter is a representative value (a demo dish's olive); the real
  value changes with every item. It is never used for UI chrome, buttons, or text.

### Neutral

- **Ink** (`#ffffff`): Primary text — dish names (h1), stat values, active
  progress dot. Full-strength white only for what matters most.
- **Ink Muted** (`#ffffffa3`, white/64): Body copy, subtitles, descriptions over
  glass. The workhorse reading color.
- **Ink Faint** (`#ffffff7a`, white/48): Section eyebrows, nav arrows, secondary
  labels. Present but quiet.
- **Ink Ghost** (`#ffffff52`, white/32): Inactive progress dots, the faintest
  micro-labels. Barely-there structure.
- **Surface** (`#000000`): The base canvas behind the camera/hero image. When the
  camera is live, the "surface" is literally the diner's table.
- **Glass Dark** (`#0000003d`, black ~20–28%): Fill for panels, pills, nav
  buttons, and the info card. Always paired with backdrop-blur.
- **Glass Light** (`#ffffff14`, white/8): Fill for the AR stage disc and stat
  tiles — a lifted, frostier surface than glass-dark.
- **Hairline** (`#ffffff29`, white/16–25): Primary border on glass elements.
- **Hairline Faint** (`#ffffff1f`, white/10–12): Concentric rings inside the AR
  stage and inner tile borders.
- **Scrim Top / Bottom** (`#00000094` → `#000000c2`): The top-to-bottom gradient
  over the camera/hero that guarantees control legibility (`from-black/58 via-
black/14 to-black/76`).

### Named Rules

**The Only-Color Rule.** The dish is the only saturated color permitted on
screen. UI chrome — every button, border, label, and panel — is drawn exclusively
from black, white, and their opacities. If a control is reaching for color, it is
wrong; emphasis comes from opacity and weight, never hue.

**The Opacity-Ramp Rule.** Text is never a flat gray. Every text and chrome tone
is white at a defined opacity over a dark/photographic surface, so legibility
holds whether the backdrop is pure black or a bright restaurant table.

## 3. Typography

**Display Font:** Geist (with `system-ui`, sans-serif fallback)
**Body Font:** Geist (same family)
**Mono Font:** Geist Mono (declared; reserved, not yet in active UI use)

**Character:** One family, multiple weights — the product-UI discipline. Geist is
a clean, slightly technical neo-grotesque that reads as modern and precise without
shouting. Hierarchy is carried by weight, size, opacity, and letter-spacing, not
by pairing a second face. Fixed rem sizes (not fluid clamps) because the surface
is a phone held at a consistent distance.

### Hierarchy

- **Display / h1** (600, 1.875rem `text-3xl`, line-height 1.25): The dish or
  category name in the info panel. The single largest element on screen.
- **Body** (400, 0.875rem `text-sm`, line-height 1.5): Subtitles, descriptions,
  the camera-blocked explainer. The reading layer, in Ink Muted.
- **Label** (600, 0.75rem `text-xs`, uppercase, letter-spacing 0.16em): Pills,
  nav-chip text, back button, the "tap dish" hint, stat-tile values.
- **Micro Label** (600, 0.65rem, uppercase, letter-spacing 0.16–0.24em): Stat-tile
  captions (PRICE / READY / PAIR), the "Category" eyebrow, model loading readout.

### Named Rules

**The Tracked-Label Rule.** Structural, secondary text is uppercase with wide
tracking (0.16–0.24em) and high opacity-drop. This is the system's instrument
voice — it labels without competing. Reserve it for short structural strings;
never set body copy or headings uppercase.

## 4. Elevation

This system is **flat-by-shadow but deep-by-glass.** There is no decorative
drop-shadow vocabulary in the Material sense; depth is created by stacking frosted
translucent layers over a live or photographic background. Shadows that do exist
are soft black ambient halos (`shadow-lg`/`shadow-2xl` with `black/20–40`) whose
only job is to lift a glass control off a busy camera feed so its edge stays
findable — they are functional separation, not styling.

### Shadow Vocabulary

- **Control Lift** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.20)`): Under pills
  and nav buttons, so a glass control reads against bright camera content.
- **Panel Lift** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.35)`): Under the
  info card and AR stage — the heaviest separation, reserved for the two anchor
  surfaces.

### Named Rules

**The Load-Bearing Glass Rule.** `backdrop-filter: blur(...)` is permitted ONLY
where content sits over the live camera or hero image and must stay legible — the
nav chip, pills, info panel, AR stage, stat tiles, loading readout. It is
forbidden as decoration on any surface that sits over a solid background. Glass is
how we read over chaos, not a look we apply for flavor.

## 5. Components

Every control shares one vocabulary: a frosted glass fill, a hairline border, a
fully-round or generously-round corner, and tracked uppercase text. Sameness is
the point — the diner learns the surface once.

### Buttons

- **Shape:** Fully circular for icon/nav controls (`rounded-full`); pill for
  labeled actions.
- **Nav arrows:** 2.75rem (`h-11 w-11`) glass-dark circle, hairline border,
  Ink-Faint `<` / `>` glyph at `text-2xl font-light`, Control Lift shadow.
- **Back ("Categories"):** Glass-dark pill, hairline border, uppercase tracked
  label, leading `<` glyph.
- **Hover / Press:** No hover on touch; the press state is `active:bg-white/12–16`
  plus, on the AR stage, `active:scale-[0.98]`. Transitions ~150–200ms.

### Chips / Pills

- **Style:** `rounded-full`, glass-dark (or `white/10`) fill, hairline border,
  backdrop-blur, uppercase tracked Label text in Ink-Muted.
- **Uses:** Camera-status chip ("Camera live"), the contextual hint ("Tap dish to
  view on your table"). Informational, not interactive.

### Cards / Containers

- **Info Panel:** The primary readout. `rounded-[1.75rem]` (card), glass-dark
  fill, `border-white/18`, `backdrop-blur-xl`, Panel Lift shadow. Holds the
  eyebrow, h1, subtitle, progress dots, and (in dish mode) the stat grid.
- **Stat Tiles:** `rounded-2xl` (tile), glass-light fill, `border-white/12`. A
  3-column grid (Price / Ready / Pair) — micro-label caption over a Label value.
- **Border:** Always a hairline; never a heavy or colored border. **Never a side
  stripe.**
- **Internal Padding:** `1rem` (panel), `0.75rem` (tiles).

### Navigation / Progress

- **Progress dots:** `h-1.5 rounded-full`. Active dot is `w-6 bg-white`; inactive
  is `w-1.5 bg-white/32`, with a width/color `transition-all`. The active pill
  elongates rather than just brightening — a quiet position indicator.

### Signature Component — The AR Stage

The heart of the UI: a large circular glass disc (`19rem`, `22rem` on `sm`) with
`glass-light` fill, hairline border, `backdrop-blur-[2px]`, and Panel Lift shadow,
containing two concentric hairline rings (`inset-8`, `inset-16`) that read as an
instrument bezel. The 3D `<model-viewer>` (or the legacy plate fallback) floats at
center, tinted by the Living Accent. Tapping the disc drills into a category or
launches AR — the dish _is_ the button. A `table-breathe` drop-shadow pulse
(3.8s) gives the floating model a subtle sense of life.

## 6. Do's and Don'ts

### Do:

- **Do** keep the surface black or the live camera; let the dish be the only
  saturated color (The Only-Color Rule).
- **Do** build all text and chrome from the white opacity ramp (Ink → Ink-Muted →
  Ink-Faint → Ink-Ghost); bump toward Ink if contrast over bright camera content
  is even close.
- **Do** use frosted glass only where content sits over the camera/hero and must
  stay legible (The Load-Bearing Glass Rule).
- **Do** carry structure with tracked uppercase micro-labels, and hierarchy with
  weight + opacity, not a second font.
- **Do** keep controls fully round or generously round with a single hairline
  border; one shared vocabulary across the whole surface.
- **Do** keep it minimal and frictionless — scan and it works. No splash, no
  takeover, nothing in the diner's face.
- **Do** honor `prefers-reduced-motion`: replace the `table-breathe` pulse and
  press-scale with a static or instant state.

### Don't:

- **Don't** introduce a warm cream/beige/parchment surface or any `--paper`-style
  near-white. There is no warm neutral in this system.
- **Don't** build the cluttered delivery-app look — no badge piles, upsell ribbons,
  or interchangeable photo-grid sameness.
- **Don't** ship the skeuomorphic clip-art CSS plate as design; it is a no-model
  fallback being retired, not a visual to extend.
- **Don't** drift toward the sterile gray SaaS dashboard — no chart-card grids, no
  gray-on-gray enterprise chrome.
- **Don't** use glassmorphism decoratively, or apply backdrop-blur to anything
  sitting over a solid background.
- **Don't** add color to UI chrome, gradient text, or `border-left`/`border-right`
  color stripes on any panel or tile.
- **Don't** set body copy or headings in uppercase; tracking is for short
  structural labels only.
