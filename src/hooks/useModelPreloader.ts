"use client";

import { useEffect } from "react";
import type { AnalyticsContext } from "@/lib/analytics";
import { trackMenuEvent } from "@/lib/analytics";

const preloadedModels = new Set<string>();

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function useModelPreloader(
  urls: string[],
  analyticsContext: AnalyticsContext = {},
) {
  useEffect(() => {
    const pendingUrls = urls.filter((url) => url && !preloadedModels.has(url));

    if (pendingUrls.length === 0) {
      return;
    }

    const controller = new AbortController();
    const idleWindow = window as WindowWithIdleCallback;

    function preloadModels() {
      for (const url of pendingUrls) {
        preloadedModels.add(url);
        void fetch(url, {
          cache: "force-cache",
          priority: "low",
          signal: controller.signal,
        } as RequestInit & { priority: "low" }).catch((error) => {
          preloadedModels.delete(url);

          if (!controller.signal.aborted) {
            trackMenuEvent("model_preload_failed", {
              ...analyticsContext,
              modelUrl: url,
              reason: error instanceof Error ? error.name : "unknown",
            });
          }
        });
      }
    }

    if (idleWindow.requestIdleCallback) {
      const idleHandle = idleWindow.requestIdleCallback(preloadModels, {
        timeout: 1800,
      });

      return () => {
        controller.abort();
        idleWindow.cancelIdleCallback?.(idleHandle);
      };
    }

    const timeoutHandle = window.setTimeout(preloadModels, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutHandle);
    };
  }, [analyticsContext, urls]);
}
