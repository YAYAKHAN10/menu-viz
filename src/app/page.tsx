import CameraMenu from "@/components/CameraMenu";
import { getDefaultRestaurant, getRestaurantBranch } from "@/data/restaurant";

export default function Home() {
  const restaurant = getDefaultRestaurant();
  const branch = getRestaurantBranch(restaurant.slug);

  return <CameraMenu restaurant={restaurant} branch={branch} />;
}
