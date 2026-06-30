"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MenuStage from "@/components/MenuStage";
import { trackMenuEvent } from "@/lib/analytics";
import type {
  MenuDish,
  RestaurantBranch,
  RestaurantMeta,
} from "@/types/restaurant";

type CameraMenuProps = {
  restaurant: RestaurantMeta;
  branch: RestaurantBranch | null;
  /** Dishes resolved for the active branch (availability + price applied). */
  dishes: MenuDish[];
  /** Campaign/QR source from the tracking link (?src=), for analytics. */
  campaign?: string;
  /** Deep-link target dish (?d=) — opens straight into this dish. */
  initialDishId?: string;
};

export default function CameraMenu({
  restaurant,
  branch,
  dishes,
  campaign,
  initialDishId,
}: CameraMenuProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<
    "starting" | "live" | "blocked"
  >("starting");
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const analyticsContext = useMemo(
    () => ({
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      branchId: branch?.id,
      branchName: branch?.name,
      campaign,
    }),
    [branch?.id, branch?.name, restaurant.name, restaurant.slug, campaign],
  );

  useEffect(() => {
    trackMenuEvent("menu_session_started", analyticsContext);
  }, [analyticsContext]);

  const startCamera = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      const cameraStartedAt = performance.now();

      trackMenuEvent("camera_started", analyticsContext);

      if (!window.isSecureContext) {
        trackMenuEvent("camera_blocked", {
          ...analyticsContext,
          reason: "insecure_context",
        });
        setCameraState("blocked");
        return null;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        trackMenuEvent("camera_unsupported", analyticsContext);
        setCameraState("blocked");
        return null;
      }

      try {
        setCameraState("starting");
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const stream = await requestCameraStream();
        const video = videoRef.current;

        if (isCancelled()) {
          stream.getTracks().forEach((track) => track.stop());
          return null;
        }

        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return null;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        if (isCancelled()) {
          stream.getTracks().forEach((track) => track.stop());
          return null;
        }

        trackMenuEvent("camera_live", {
          ...analyticsContext,
          durationMs: Math.round(performance.now() - cameraStartedAt),
        });
        setCameraState("live");

        return stream;
      } catch (error) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (isCancelled()) {
          return null;
        }

        trackMenuEvent("camera_blocked", {
          ...analyticsContext,
          durationMs: Math.round(performance.now() - cameraStartedAt),
          reason: error instanceof Error ? error.name : "unknown",
        });
        setCameraState("blocked");
        return null;
      }
    },
    [analyticsContext],
  );

  const captureBackgroundFrame = useCallback(() => {
    const video = videoRef.current;

    if (!video || cameraState !== "live" || video.readyState < 2) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      return canvas.toDataURL("image/jpeg", 0.9);
    } catch {
      return null;
    }
  }, [cameraState]);

  useEffect(() => {
    let cancelled = false;

    async function openCamera() {
      const stream = await startCamera(() => cancelled);

      if (cancelled && stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }

    openCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraAttempt, startCamera]);

  return (
    <main className="min-h-dvh bg-black text-white">
      <section className="relative isolate min-h-dvh overflow-hidden px-4 pt-4 pb-4">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            cameraState === "live" ? "opacity-100" : "opacity-0"
          }`}
        />

        <Image
          src={restaurant.heroImageUrl}
          alt={`${restaurant.name} dining room`}
          fill
          priority
          className={`object-cover transition-opacity duration-500 ${
            cameraState === "live" ? "opacity-0" : "opacity-100"
          }`}
          sizes="100vw"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/58 via-black/14 to-black/76" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col">
          <nav className="flex items-center justify-between py-1">
            <p className="text-sm font-semibold tracking-tight text-white/82">
              {restaurant.name}
            </p>
            <p className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
              {cameraState === "live" ? "Camera live" : "Camera"}
            </p>
          </nav>
        </div>

        {cameraState === "blocked" && (
          <div className="absolute inset-x-5 top-16 z-20 rounded-3xl border border-white/14 bg-black/28 p-4 text-sm leading-6 text-white/68 backdrop-blur-md">
            <p>
              Allow camera access in your browser to view the live table
              background.
            </p>
            <button
              type="button"
              onClick={() => setCameraAttempt((attempt) => attempt + 1)}
              className="mt-3 rounded-full border border-white/18 bg-white/10 px-4 py-2.5 text-xs font-semibold tracking-[0.14em] text-white/78 uppercase outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:bg-white/16"
            >
              Try camera
            </button>
          </div>
        )}

        <MenuStage
          restaurant={restaurant}
          branch={branch}
          dishes={dishes}
          initialDishId={initialDishId}
          getBackgroundFrame={captureBackgroundFrame}
        />
      </section>
    </main>
  );
}

async function requestCameraStream() {
  const constraints: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 1920 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: { ideal: "environment" },
      },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ];
  let lastError: unknown;

  for (const constraint of constraints) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraint);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
