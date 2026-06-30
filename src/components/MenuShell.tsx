"use client";

import { useEffect, useMemo, useState } from "react";
import MenuDrawer from "@/components/MenuDrawer";
import MenuStage from "@/components/MenuStage";
import { trackMenuEvent } from "@/lib/analytics";
import { withViewTransition } from "@/lib/viewTransition";
import type {
  MenuDish,
  RestaurantBranch,
  RestaurantMeta,
} from "@/types/restaurant";

type MenuShellProps = {
  restaurant: RestaurantMeta;
  branch: RestaurantBranch | null;
  /** Dishes resolved for the active branch (availability + price applied). */
  dishes: MenuDish[];
  /** Campaign/QR source from the tracking link (?src=), for analytics. */
  campaign?: string;
  /** Deep-link target dish (?d=) — opens straight into this dish. */
  initialDishId?: string;
};

/**
 * The diner shell: a clean dark product-viewer stage that the 3D menu floats
 * over, with a pull-down menu sheet for browsing the full menu. The live camera
 * was removed for the MVP — AR is a per-dish button, not the home base.
 */
export default function MenuShell({
  restaurant,
  branch,
  dishes,
  campaign,
  initialDishId,
}: MenuShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDishId, setActiveDishId] = useState(
    () =>
      dishes.find((dish) => dish.id === initialDishId)?.id ??
      dishes[0]?.id ??
      "",
  );

  const analyticsContext = useMemo(
    () => ({
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      branchId: branch?.id,
      branchName: branch?.name,
      campaign,
    }),
    [branch?.id, branch?.name, restaurant.name, restaurant.slug, campaign],
  );

  useEffect(() => {
    trackMenuEvent("menu_session_started", analyticsContext);
  }, [analyticsContext]);

  function handleOpenChange(next: boolean) {
    // Container morph between the "Full menu" pill and the sheet.
    withViewTransition(() => {
      setMenuOpen(next);
      if (next) {
        trackMenuEvent("menu_opened", analyticsContext);
      }
    });
  }

  return (
    <main className="bg-void text-bone min-h-dvh">
      <section className="relative isolate min-h-dvh overflow-hidden px-4 pt-4 pb-4">
        {/* Grainy framing backdrop — soft glows hug the top & bottom edges and
            the dish floats in the darker middle. The 3D canvas is transparent,
            so this shows through behind the model (no live camera). */}
        <div className="stage-backdrop pointer-events-none absolute inset-0" />
        <div className="stage-grain pointer-events-none absolute inset-0" />

        {/* The demoed restaurant's logo, top of page (covered when the menu
            sheet opens). */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/brim-logo.png"
            alt="Brim Big Juicy Burgers"
            className="h-11 w-auto"
          />
        </div>

        <MenuStage
          restaurant={restaurant}
          branch={branch}
          dishes={dishes}
          activeDishId={activeDishId}
          onSelectDish={setActiveDishId}
          menuOpen={menuOpen}
          onOpenMenu={() => handleOpenChange(true)}
        />

        <MenuDrawer
          dishes={dishes}
          currency={restaurant.currency}
          restaurantName={restaurant.name}
          activeDishId={activeDishId}
          open={menuOpen}
          onOpenChange={handleOpenChange}
          onSelectDish={setActiveDishId}
        />
      </section>
    </main>
  );
}
