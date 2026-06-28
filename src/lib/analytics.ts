"use client";

import { track } from "@vercel/analytics";

export type AnalyticsContext = {
  restaurantSlug?: string;
  restaurantName?: string;
  branchId?: string;
  branchName?: string;
  category?: string;
  dishId?: string;
  dishName?: string;
  modelUrl?: string;
  durationMs?: number;
  progress?: number;
  reason?: string;
  direction?: "next" | "previous";
  mode?: "categories" | "dishes";
  source?: string;
};

export type MenuAnalyticsEvent =
  | "menu_session_started"
  | "camera_started"
  | "camera_live"
  | "camera_blocked"
  | "camera_unsupported"
  | "category_viewed"
  | "category_opened"
  | "dish_viewed"
  | "menu_navigation"
  | "model_load_started"
  | "model_load_ready"
  | "model_load_slow"
  | "model_load_error"
  | "model_preload_failed";

export function trackMenuEvent(
  eventName: MenuAnalyticsEvent,
  context: AnalyticsContext = {},
) {
  const payload = removeEmptyValues(context);

  try {
    track(eventName, payload);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics failed]", eventName, error);
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", eventName, payload);
  }
}

function removeEmptyValues(context: AnalyticsContext) {
  return Object.fromEntries(
    Object.entries(context).filter(
      (entry): entry is [string, string | number] => entry[1] !== undefined,
    ),
  );
}
