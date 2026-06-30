import type { Restaurant } from "@/types/restaurant";

// Builds the trackable deep links a restaurant hands out — one per branch, and
// one per branch×item — each carrying an analytics `src` so every scan is
// attributable to a specific location and (optionally) a specific dish. The app
// reads `branch`, `src`, and `d` from the query (see restaurants/[slug]/page).

export type TrackingLink = {
  label: string;
  /** Stable analytics source token, also used as the link's `src`. */
  src: string;
  /** Root-relative path with query params. */
  path: string;
  branchId: string;
  dishId?: string;
};

export type BranchLinks = {
  branchId: string;
  branchName: string;
  city: string;
  /** The branch-level scan link (full menu for that location). */
  branch: TrackingLink;
  /** One deep link per dish the branch serves. */
  items: TrackingLink[];
};

function buildPath(
  slug: string,
  params: { branch: string; src: string; d?: string },
): string {
  const search = new URLSearchParams({
    branch: params.branch,
    src: params.src,
  });

  if (params.d) {
    search.set("d", params.d);
  }

  return `/restaurants/${slug}?${search.toString()}`;
}

/** All branch and per-item tracking links for a restaurant. */
export function getTrackingLinks(restaurant: Restaurant): BranchLinks[] {
  const dishesById = new Map(restaurant.dishes.map((dish) => [dish.id, dish]));

  return restaurant.branches.map((branch) => {
    const branchSrc = `qr-${branch.id}`;

    const items: TrackingLink[] = branch.menu
      .filter((item) => item.available)
      .map((item) => {
        const dish = dishesById.get(item.dishId);
        const src = `qr-${branch.id}-${item.dishId}`;

        return {
          label: dish?.name ?? item.dishId,
          src,
          path: buildPath(restaurant.slug, {
            branch: branch.id,
            src,
            d: item.dishId,
          }),
          branchId: branch.id,
          dishId: item.dishId,
        };
      });

    return {
      branchId: branch.id,
      branchName: branch.name,
      city: branch.city,
      branch: {
        label: `${branch.name} — full menu`,
        src: branchSrc,
        path: buildPath(restaurant.slug, { branch: branch.id, src: branchSrc }),
        branchId: branch.id,
      },
      items,
    };
  });
}

/** Turns a root-relative path into an absolute URL given a request origin. */
export function toAbsolute(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, "")}${path}`;
}
