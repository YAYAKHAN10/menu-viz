// Launches the OS AR viewers directly (no model-viewer dependency). Android →
// Scene Viewer via an ARCore intent; iOS → AR Quick Look via a rel="ar" anchor.
// Both are single-object viewers, so we hand them ONE pre-composed model URL —
// resolveArModel maps the diner's variant selection to a pre-baked combo.

import { comboModelUrl } from "@/lib/assets";
import { comboKey } from "@/lib/combo";
import { BAKED_COMBOS } from "@/lib/combos.generated";
import type { MenuDish } from "@/types/restaurant";

export type ArCapability = "scene-viewer" | "quick-look" | "none";

export function detectArCapability(): ArCapability {
  if (typeof navigator === "undefined") {
    return "none";
  }

  const ua = navigator.userAgent;
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    // iPadOS reports as desktop Safari but is touch-capable.
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

  if (isIOS) {
    return "quick-look";
  }

  if (/Android/i.test(ua)) {
    return "scene-viewer";
  }

  return "none";
}

/**
 * Resolves the single model URL to drop in AR for a dish + the diner's variant
 * selection. When a combo has been baked for that selection (its key is in
 * BAKED_COMBOS, see scripts/bake-combos.ts), Scene Viewer gets the composed
 * GLB; otherwise it falls back to the base dish. iOS combos aren't baked to
 * USDZ yet, so Quick Look always uses the base dish USDZ.
 */
export function resolveArModel(
  dish: MenuDish,
  variantSelection: Record<string, string>,
  platform: "android" | "ios",
): string | undefined {
  if (platform === "ios") {
    return dish.iosModelUrl;
  }

  const key = comboKey(dish.id, variantSelection, dish.variants ?? []);

  if (key !== dish.id && BAKED_COMBOS.has(key)) {
    return comboModelUrl(key);
  }

  return dish.modelUrl;
}

function absolute(url: string): string {
  if (typeof window === "undefined") {
    return url;
  }

  return url.startsWith("http") ? url : `${window.location.origin}${url}`;
}

export function launchSceneViewer(modelUrl: string) {
  const params = new URLSearchParams({
    file: absolute(modelUrl),
    mode: "ar_only",
    // Fixed = the model's authored real-world scale; no pinch-resize.
    resizable: "false",
  });

  const fallback = window.location.href;
  const intent =
    `intent://arvr.google.com/scene-viewer/1.0?${params.toString()}` +
    `#Intent;scheme=https;package=com.google.ar.core;` +
    `action=android.intent.action.VIEW;` +
    `S.browser_fallback_url=${encodeURIComponent(fallback)};end;`;

  window.location.href = intent;
}

export function launchQuickLook(usdzUrl: string) {
  const anchor = document.createElement("a");
  anchor.setAttribute("rel", "ar");
  anchor.href = absolute(usdzUrl);
  // Quick Look requires a child node to trigger from a synthetic click.
  anchor.appendChild(document.createElement("img"));
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** True when this device can drop the given dish into OS AR. */
export function canLaunchAr(dish: MenuDish): boolean {
  const capability = detectArCapability();

  if (capability === "scene-viewer") {
    return Boolean(dish.modelUrl);
  }

  if (capability === "quick-look") {
    return Boolean(dish.iosModelUrl);
  }

  return false;
}

export function launchAr(
  dish: MenuDish,
  variantSelection: Record<string, string> = {},
): boolean {
  const capability = detectArCapability();

  if (capability === "scene-viewer") {
    const model = resolveArModel(dish, variantSelection, "android");

    if (!model) {
      return false;
    }

    launchSceneViewer(model);
    return true;
  }

  if (capability === "quick-look") {
    const model = resolveArModel(dish, variantSelection, "ios");

    if (!model) {
      return false;
    }

    launchQuickLook(model);
    return true;
  }

  return false;
}
