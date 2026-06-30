import CameraMenu from "@/components/CameraMenu";
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
    <CameraMenu
      restaurant={toRestaurantMeta(restaurant)}
      branch={branch}
      dishes={dishes}
      campaign="direct"
    />
  );
}
