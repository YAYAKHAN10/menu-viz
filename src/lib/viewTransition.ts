"use client";

import { flushSync } from "react-dom";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    finished?: Promise<unknown>;
  };
};

/**
 * Runs a state update inside a View Transition so the browser tweens the
 * before/after layout — the container morphs (menu pill ↔ sheet, dish card ↔
 * options) and the directional dish-stage slide. `flushSync` lands React's DOM
 * change inside the transition so both states are captured.
 *
 * Pass `type` (e.g. "next" / "prev") to tag the run with `:root[data-vt=…]` so
 * scoped CSS can pick a direction-specific animation; it's cleared when the
 * transition finishes. Falls back to a plain update without the API or under
 * reduced motion.
 */
export function withViewTransition(apply: () => void, type?: string) {
  const doc = document as ViewTransitionDocument;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (!doc.startViewTransition || reducedMotion) {
    apply();
    return;
  }

  const root = document.documentElement;
  if (type) {
    root.dataset.vt = type;
  }
  const transition = doc.startViewTransition(() => flushSync(apply));
  if (type) {
    const clear = () => {
      delete root.dataset.vt;
    };
    transition.finished?.then(clear, clear);
  }
}
