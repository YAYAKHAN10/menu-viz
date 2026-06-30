import type { Metadata } from "next";
import LinksBoard from "@/components/LinksBoard";
import { getDefaultRestaurant } from "@/data/restaurant";
import { getTrackingLinks } from "@/lib/links";

export const metadata: Metadata = {
  title: "MenuViz — Tracking links",
  robots: { index: false, follow: false },
};

export default function LinksPage() {
  const restaurant = getDefaultRestaurant();
  const groups = getTrackingLinks(restaurant);

  return <LinksBoard restaurantName={restaurant.name} groups={groups} />;
}
