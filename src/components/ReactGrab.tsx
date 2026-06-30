"use client";

import { useEffect } from "react";

/**
 * Dev-only mount for React Grab (devDependency) — lets you ⌘C / Ctrl+C any UI
 * element to copy its source context for a coding agent. The dynamic import is
 * dead-code-eliminated from production builds via the NODE_ENV guard.
 */
export default function ReactGrab() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }
    import("react-grab");
  }, []);

  return null;
}
