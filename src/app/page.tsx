import MenuShell from "@/components/MenuShell";
import {
  getBranchMenu,
  getDefaultRestaurant,
  getRestaurantBranch,
} from "@/data/restaurant";
import { toRestaurantMeta } from "@/types/restaurant";

export default function Home() {
  const restaurant = getDefaultRestaurant();
  const branch = getRestaurantBranch(restaurant.slug);
  const dishes = getBranchMenu(restaurant.slug, branch);

  return (
    <MenuShell
      restaurant={toRestaurantMeta(restaurant)}
      branch={branch}
      dishes={dishes}
      campaign="direct"
    />
  );
}
