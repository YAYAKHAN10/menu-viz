"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalyticsContext } from "@/lib/analytics";
import { trackMenuEvent } from "@/lib/analytics";

type DishModelProps = {
  src: string;
  alt: string;
  rotation: {
    azimuth: number;
    polar: number;
  };
  analyticsContext: AnalyticsContext;
};

type ModelState = {
  src: string;
  status: "loading" | "slow" | "ready" | "error";
  progress: number;
};

export default function DishModel({
  src,
  alt,
  rotation,
  analyticsContext,
}: DishModelProps) {
  const viewerRef = useRef<HTMLElement>(null);
  const loadStartedAtRef = useRef(0);
  const readyTrackedRef = useRef(false);
  const slowTrackedRef = useRef(false);
  const [modelState, setModelState] = useState<ModelState>({
    src,
    status: "loading",
    progress: 0,
  });
  const currentState =
    modelState.src === src
      ? modelState
      : { src, status: "loading" as const, progress: 0 };

  useEffect(() => {
    loadStartedAtRef.current = performance.now();
    readyTrackedRef.current = false;
    slowTrackedRef.current = false;
    trackMenuEvent("model_load_started", analyticsContext);

    void import("@google/model-viewer").catch(() => {
      trackMenuEvent("model_load_error", {
        ...analyticsContext,
        reason: "model-viewer-import",
      });
      setModelState({ src, status: "error", progress: 0 });
    });
  }, [analyticsContext, src]);

  useEffect(() => {
    const timeoutHandle = window.setTimeout(() => {
      setModelState((state) => {
        if (state.src !== src || state.status !== "loading") {
          return state;
        }

        if (!slowTrackedRef.current) {
          slowTrackedRef.current = true;
          trackMenuEvent("model_load_slow", {
            ...analyticsContext,
            durationMs: Math.round(
              performance.now() - loadStartedAtRef.current,
            ),
            progress: state.progress,
          });
        }

        return { ...state, status: "slow" };
      });
    }, 9000);

    return () => {
      window.clearTimeout(timeoutHandle);
    };
  }, [analyticsContext, src]);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!viewer) {
      return;
    }

    function handleLoad() {
      trackReady(1);
      setModelState({ src, status: "ready", progress: 1 });
    }

    function handleError() {
      trackMenuEvent("model_load_error", {
        ...analyticsContext,
        durationMs: Math.round(performance.now() - loadStartedAtRef.current),
        reason: "model-viewer-error",
      });
      setModelState({ src, status: "error", progress: 0 });
    }

    function handleProgress(event: Event) {
      const progressEvent = event as CustomEvent<{ totalProgress?: number }>;
      const totalProgress = progressEvent.detail?.totalProgress;

      if (typeof totalProgress === "number") {
        const progress = Math.min(Math.max(totalProgress, 0), 1);

        setModelState((state) => ({
          src,
          status:
            progress >= 0.995
              ? "ready"
              : state.src === src && state.status === "slow"
                ? "slow"
                : "loading",
          progress,
        }));

        if (progress >= 0.995) {
          trackReady(progress);
        }
      }
    }

    function trackReady(progress: number) {
      if (readyTrackedRef.current) {
        return;
      }

      readyTrackedRef.current = true;
      trackMenuEvent("model_load_ready", {
        ...analyticsContext,
        durationMs: Math.round(performance.now() - loadStartedAtRef.current),
        progress,
      });
    }

    viewer.addEventListener("load", handleLoad);
    viewer.addEventListener("error", handleError);
    viewer.addEventListener("progress", handleProgress);

    return () => {
      viewer.removeEventListener("load", handleLoad);
      viewer.removeEventListener("error", handleError);
      viewer.removeEventListener("progress", handleProgress);
    };
  }, [analyticsContext, src]);

  return (
    <div className="relative h-full w-full">
      <model-viewer
        key={src}
        ref={viewerRef}
        src={src}
        alt={alt}
        camera-orbit={`${rotation.azimuth}deg ${rotation.polar}deg auto`}
        camera-target="auto auto auto"
        field-of-view="36deg"
        bounds="tight"
        min-camera-orbit="auto 0deg auto"
        max-camera-orbit="auto 180deg auto"
        reveal="auto"
        loading="eager"
        shadow-intensity="1"
        exposure="1.35"
        interaction-prompt="none"
        disable-zoom
        class="pointer-events-none h-full w-full"
      />

      {currentState.status !== "ready" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/14 text-center text-[0.68rem] font-semibold tracking-[0.16em] text-white/76 uppercase backdrop-blur-[1px]">
          {currentState.status === "error"
            ? "Model failed"
            : currentState.status === "slow"
              ? "Preparing large model"
              : `Loading model ${Math.round(currentState.progress * 100)}%`}
        </div>
      )}
    </div>
  );
}
