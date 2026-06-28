// Resolves 3D asset URLs. When NEXT_PUBLIC_CDN_BASE is set (e.g. the R2 public
// URL or a CDN custom domain) assets are served from there; otherwise they fall
// back to the local `public/` files so `next dev` works with no env at all.
// NEXT_PUBLIC_* is inlined at build time, so set it before `build`/`build:worker`.
const CDN_BASE = (process.env.NEXT_PUBLIC_CDN_BASE ?? "").replace(/\/+$/, "");

function assetUrl(path: string) {
  return CDN_BASE ? `${CDN_BASE}/${path}` : `/${path}`;
}

export const dishModelUrl = (dishId: string) =>
  assetUrl(`models/dishes/${dishId}.glb`);

export const dishUsdzUrl = (dishId: string) =>
  assetUrl(`models/dishes/${dishId}.usdz`);
