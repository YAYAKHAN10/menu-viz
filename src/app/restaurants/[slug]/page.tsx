import { notFound } from "next/navigation";
import MenuShell from "@/components/MenuShell";
import {
  getBranchMenu,
  getRestaurantBranch,
  getRestaurantBySlug,
} from "@/data/restaurant";
import { toRestaurantMeta } from "@/types/restaurant";

type RestaurantPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    /** Branch id — varies menu, pricing and per-location analytics. */
    branch?: string;
    /** Campaign / QR source for analytics attribution. */
    src?: string;
    /** Deep-link a specific dish (opens straight into it). */
    d?: string;
  }>;
};

export default async function RestaurantPage({
  params,
  searchParams,
}: RestaurantPageProps) {
  const { slug } = await params;
  const { branch: branchId, src, d: initialDishId } = await searchParams;
  const restaurant = getRestaurantBySlug(slug);

  if (!restaurant) {
    notFound();
  }

  const branch = getRestaurantBranch(slug, branchId);
  const dishes = getBranchMenu(slug, branch);

  return (
    <MenuShell
      restaurant={toRestaurantMeta(restaurant)}
      branch={branch}
      dishes={dishes}
      campaign={src ?? (branchId ? `branch-${branchId}` : "direct")}
      initialDishId={initialDishId}
    />
  );
}
