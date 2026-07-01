import type { MenuDish } from "@/types/restaurant";

export type MenuSection = { category: string; dishes: MenuDish[] };

/**
 * Groups branch dishes into category sections, category order = first
 * appearance in the menu. Shared by the 3D stage and the menu drawer so they
 * always agree on grouping and ordering.
 */
export function buildSections(dishes: MenuDish[]): MenuSection[] {
  const order: string[] = [];

  for (const dish of dishes) {
    if (!order.includes(dish.category)) {
      order.push(dish.category);
    }
  }

  return order
    .map((category) => ({
      category,
      dishes: dishes.filter((dish) => dish.category === category),
    }))
    .filter((section) => section.dishes.length > 0);
}

/** Finds a dish by id, falling back to the first dish (never returns undefined
 *  for a non-empty menu). */
export function resolveActiveDish(
  dishes: MenuDish[],
  activeDishId: string | undefined,
): MenuDish | undefined {
  return dishes.find((dish) => dish.id === activeDishId) ?? dishes[0];
}

/** The id of the next/previous dish in flat menu order, wrapping around. */
export function neighbourDishId(
  dishes: MenuDish[],
  activeDishId: string,
  direction: 1 | -1,
): string {
  const index = dishes.findIndex((dish) => dish.id === activeDishId);

  if (index < 0 || dishes.length === 0) {
    return activeDishId;
  }

  const next = (index + direction + dishes.length) % dishes.length;
  return dishes[next].id;
}
