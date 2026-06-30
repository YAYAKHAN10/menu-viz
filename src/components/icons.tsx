import type { ReactNode } from "react";

type IconProps = { className?: string };

/** Shared stroke-icon frame — consistent weight, round joins, currentColor. */
function Stroke({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? "h-5 w-5"}
    >
      {children}
    </svg>
  );
}

export function ChevronLeft({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M14.5 18 8.5 12l6-6" />
    </Stroke>
  );
}

export function ChevronRight({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M9.5 6l6 6-6 6" />
    </Stroke>
  );
}

export function ChevronDown({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M6 9.5l6 6 6-6" />
    </Stroke>
  );
}

/** List glyph — the full-menu affordance. */
export function Menu({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </Stroke>
  );
}

export function Plus({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Stroke>
  );
}

export function Check({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M5 12.5 9.5 17 19 7" />
    </Stroke>
  );
}

/** A 3D cube — the "place it on your table" / AR affordance. */
export function Cube({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 2.6 20.5 7.3v9.4L12 21.4 3.5 16.7V7.3z" />
      <path d="M3.7 7.4 12 12l8.3-4.6" />
      <path d="M12 21.4V12" />
    </Stroke>
  );
}

/** iOS-style share glyph for the photo share action. */
export function Share({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M8 10.5H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
      <path d="M12 14.5V3" />
      <path d="M8.5 6.5 12 3l3.5 3.5" />
    </Stroke>
  );
}

/** Solid four-point sparkle — the "customise this" cue. Symmetric about the
 *  viewBox centre so it sits optically centred next to a label. */
export function Sparkle({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className ?? "h-5 w-5"}
    >
      <path d="M12 3.2 13.7 10.3 20.8 12 13.7 13.7 12 20.8 10.3 13.7 3.2 12 10.3 10.3Z" />
    </svg>
  );
}
