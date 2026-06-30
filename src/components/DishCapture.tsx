"use client";

import { useEffect, useRef, useState } from "react";

export type CaptureResult = {
  blob: Blob;
  previewUrl: string;
};

type DishCaptureProps = {
  /** "composing" while the canvas renders, then the result or an error. */
  status: "composing" | "ready" | "error";
  result: CaptureResult | null;
  dishName: string;
  shareText: string;
  onClose: () => void;
  onShared: (channel: string) => void;
};

export default function DishCapture({
  status,
  result,
  dishName,
  shareText,
  onClose,
  onShared,
}: DishCaptureProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  // Drive the native <dialog> imperatively so we get the top-layer + backdrop
  // for free (no z-index scale to invent, no focus-trap to hand-roll).
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const fileName = `${slugify(dishName)}-menuviz.jpg`;

  async function handleShare() {
    if (!result || busy) {
      return;
    }

    setBusy(true);

    try {
      const file = new File([result.blob], fileName, {
        type: result.blob.type,
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText });
        onShared("web-share");
      } else {
        downloadBlob(result.previewUrl, fileName);
        onShared("download-fallback");
      }
    } catch (error) {
      // AbortError = user dismissed the share sheet; not a failure.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        downloadBlob(result.previewUrl, fileName);
        onShared("download-fallback");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    if (!result) {
      return;
    }

    downloadBlob(result.previewUrl, fileName);
    onShared("save");
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      className="m-auto w-[min(92vw,26rem)] bg-transparent p-0 text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/18 bg-black/55 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/56 uppercase">
            Share a photo
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-white/8 text-lg leading-none text-white/70 outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:bg-white/16"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-white/12 bg-black/40">
          {status === "ready" && result ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.previewUrl}
              alt={`${dishName} share photo preview`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-center text-[0.7rem] font-semibold tracking-[0.16em] text-white/70 uppercase">
              {status === "error" ? "Couldn't make the photo" : "Composing…"}
            </div>
          )}
        </div>

        {status === "error" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/90 px-5 py-3 text-sm font-semibold text-black active:bg-white"
          >
            Close
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleShare}
              disabled={status !== "ready" || busy}
              className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition active:scale-[0.99] active:bg-white/90 disabled:opacity-50"
            >
              {busy ? "Sharing…" : "Share"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={status !== "ready"}
              className="rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 active:bg-white/16 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}

function downloadBlob(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "dish"
  );
}
