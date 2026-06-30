"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { BranchLinks } from "@/lib/links";

type LinksBoardProps = {
  restaurantName: string;
  groups: BranchLinks[];
};

export default function LinksBoard({
  restaurantName,
  groups,
}: LinksBoardProps) {
  return (
    <main className="min-h-dvh bg-black px-5 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <p className="text-xs font-semibold tracking-[0.24em] text-white/56 uppercase">
            {restaurantName}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Tracking links
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-white/64">
            One QR per location, and a deep link per dish. Every scan carries a{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/80">
              src
            </code>{" "}
            tag, so the analytics funnel is attributable to a branch and item.
          </p>
        </header>

        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <section key={group.branchId}>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">{group.branchName}</h2>
                <span className="text-xs font-semibold tracking-[0.16em] text-white/48 uppercase">
                  {group.city}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <LinkCard link={group.branch} primary />
                {group.items.map((item) => (
                  <LinkCard key={item.src} link={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

type LinkCardProps = {
  link: BranchLinks["branch"];
  primary?: boolean;
};

function LinkCard({ link, primary = false }: LinkCardProps) {
  // Resolve the absolute URL once, on the client (lazy init avoids reading
  // window during SSR and avoids a synchronous setState-in-effect).
  const [url] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URL(link.path, window.location.origin).toString(),
  );
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) {
      return;
    }

    let active = true;

    QRCode.toDataURL(url, {
      margin: 1,
      width: 240,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (active) {
          setQr(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setQr(null);
        }
      });

    return () => {
      active = false;
    };
  }, [url]);

  async function copy() {
    if (!url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={`flex gap-3 rounded-2xl border p-3 ${
        primary
          ? "border-white/20 bg-white/10"
          : "border-white/12 bg-white/[0.04]"
      }`}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt={`QR code for ${link.label}`}
            className="h-full w-full"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-white/80" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="truncate text-sm font-semibold">{link.label}</p>
          <p className="mt-0.5 truncate text-xs text-white/52">
            src: {link.src}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="mt-2 self-start rounded-full border border-white/16 bg-white/8 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-white/80 uppercase transition outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:bg-white/16"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
