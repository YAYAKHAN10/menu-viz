import { notFound } from "next/navigation";
import CameraMenu from "@/components/CameraMenu";
import { getRestaurantBranch, getRestaurantBySlug } from "@/data/restaurant";

type RestaurantPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    branch?: string;
  }>;
};

export default async function RestaurantPage({
  params,
  searchParams,
}: RestaurantPageProps) {
  const { slug } = await params;
  const { branch: branchId } = await searchParams;
  const restaurant = getRestaurantBySlug(slug);

  if (!restaurant) {
    notFound();
  }

  const branch = getRestaurantBranch(slug, branchId);

  return <CameraMenu restaurant={restaurant} branch={branch} />;
}
