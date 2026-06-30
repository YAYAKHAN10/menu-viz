"use client";

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
  /** Campaign / QR source from the tracking link (?src=). */
  campaign?: string;
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
  | "ar_launched"
  | "model_load_started"
  | "model_load_ready"
  | "model_load_slow"
  | "model_load_error"
  | "model_load_retry"
  | "model_preload_failed"
  | "addon_toggled"
  | "variant_selected"
  | "capture_open"
  | "capture_taken"
  | "capture_failed"
  | "share";

export function trackMenuEvent(
  eventName: MenuAnalyticsEvent,
  context: AnalyticsContext = {},
) {
  const payload = removeEmptyValues(context);

  try {
    sendEvent(eventName, payload);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics failed]", eventName, error);
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", eventName, payload);
  }
}

type AnalyticsPayload = Record<string, string | number>;

// The single seam for the event sink. Currently a no-op in production — the
// privacy-light pipeline (HANDOFF §8/§12) is not chosen yet. Wire it here, e.g.
// `navigator.sendBeacon("/api/events", ...)` to a Workers route, without
// touching any call sites.
function sendEvent(_eventName: MenuAnalyticsEvent, _payload: AnalyticsPayload) {
  // intentionally empty until the pipeline lands
}

function removeEmptyValues(context: AnalyticsContext) {
  return Object.fromEntries(
    Object.entries(context).filter(
      (entry): entry is [string, string | number] => entry[1] !== undefined,
    ),
  );
}
