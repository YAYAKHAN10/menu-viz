import type { HTMLAttributes, Key, Ref } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        key?: Key;
        ref?: Ref<HTMLElement>;
        class?: string;
        "camera-orbit"?: string;
        "camera-target"?: string;
        "min-camera-orbit"?: string;
        "max-camera-orbit"?: string;
        "field-of-view"?: string;
        bounds?: string;
        reveal?: string;
        loading?: string;
        "shadow-intensity"?: string;
        exposure?: string;
        "interaction-prompt"?: string;
        "disable-zoom"?: boolean;
      };
    }
  }
}
