import { dishModelUrl, dishUsdzUrl } from "@/lib/assets";
import type {
  MenuDish,
  Restaurant,
  RestaurantBranch,
} from "@/types/restaurant";

// iOS Quick Look needs USDZ, which we don't have yet (only GLB). Flip to true
// once USDZ assets are generated and uploaded to R2 so iOS AR turns on without
// shipping a broken "View on my table" button. Android Scene Viewer uses the GLB
// and works today.
const USDZ_READY = false;
const dishUsdz = (dishId: string) =>
  USDZ_READY ? dishUsdzUrl(dishId) : undefined;

export const restaurants: Restaurant[] = [
  {
    slug: "stacked",
    name: "Stacked",
    cuisine: "Smash burgers & fried chicken",
    location: "Islamabad, Pakistan",
    currency: "Rs.",
    defaultBranchId: "f7-markaz",
    description:
      "A two-item demo store: scan, swipe, and drop a true-to-size burger or crispy chicken sandwich onto your own table in AR.",
    heroImageUrl: "/images/menuviz-hero.png",
    rating: "4.9",
    dishes: [
      {
        id: "beef-burger",
        name: "Smash Beef Burger",
        subtitle: "Double smash patty, cheddar, house sauce",
        description:
          "Two thin-smashed beef patties with melted cheddar, pickles, onions, and a tangy house sauce on a toasted brioche bun.",
        price: 1290,
        category: "Burgers",
        modelUrl: dishModelUrl("beef-burger"),
        iosModelUrl: dishUsdz("beef-burger"),
        prepTime: "12 min",
        pairing: "Salted caramel shake",
        highlights: ["Double patty", "Halal beef", "Best seller"],
        modelColors: {
          primary: "#c46f32",
          secondary: "#7a4a28",
          accent: "#e08a3c",
        },
        // Single-select "version" — exactly one side comes with the burger.
        variants: [
          {
            id: "side",
            name: "Side",
            defaultOptionId: "fries",
            options: [
              {
                id: "fries",
                name: "Fries",
                kind: "side",
                placeholderColor: "#e0a441",
              },
              {
                id: "mashed",
                name: "Mashed potato",
                price: 50,
                kind: "side",
                placeholderColor: "#ecdcae",
              },
              {
                id: "salad",
                name: "Side salad",
                kind: "side",
                placeholderColor: "#6fae54",
              },
            ],
          },
        ],
        // Additive extras (primitive previews) until real GLBs are authored.
        addOns: [
          {
            id: "cola",
            name: "Cola",
            price: 200,
            kind: "drink",
            placeholderColor: "#b23b3b",
          },
          {
            id: "extra-cheese",
            name: "Extra cheese",
            price: 150,
            kind: "extra",
            placeholderColor: "#e8b54a",
          },
          {
            id: "bacon",
            name: "Bacon",
            price: 300,
            kind: "extra",
            placeholderColor: "#9a4b34",
          },
        ],
      },
      {
        id: "crispy-chicken",
        name: "Crispy Chicken Sandwich",
        subtitle: "Buttermilk-fried fillet, slaw, spicy mayo",
        description:
          "A craggy buttermilk-fried chicken fillet with crunchy slaw and spicy mayo on a soft potato bun.",
        price: 1190,
        category: "Chicken",
        modelUrl: dishModelUrl("crispy-chicken"),
        iosModelUrl: dishUsdz("crispy-chicken"),
        prepTime: "13 min",
        pairing: "Mint lemonade",
        highlights: ["Buttermilk brined", "Extra crispy", "Spicy option"],
        modelColors: {
          primary: "#c98a3c",
          secondary: "#7c5a24",
          accent: "#e0a441",
        },
        variants: [
          {
            id: "side",
            name: "Side",
            defaultOptionId: "fries",
            options: [
              {
                id: "fries",
                name: "Fries",
                kind: "side",
                placeholderColor: "#e0a441",
              },
              {
                id: "coleslaw",
                name: "Coleslaw",
                kind: "side",
                placeholderColor: "#cfd8a0",
              },
              {
                id: "mac",
                name: "Mac & cheese",
                price: 120,
                kind: "side",
                placeholderColor: "#e8b54a",
              },
            ],
          },
        ],
        addOns: [
          {
            id: "lemonade",
            name: "Mint lemonade",
            price: 220,
            kind: "drink",
            placeholderColor: "#9bd07a",
          },
          {
            id: "spicy-sauce",
            name: "Spicy sauce",
            price: 100,
            kind: "extra",
            placeholderColor: "#c0392b",
          },
        ],
      },
    ],
    branches: [
      {
        id: "f7-markaz",
        name: "F-7 Markaz",
        address: "F-7 Markaz",
        city: "Islamabad",
        country: "Pakistan",
        // Flagship — full menu at base price.
        menu: [
          { dishId: "beef-burger", available: true },
          { dishId: "crispy-chicken", available: true },
        ],
      },
      {
        id: "dha-lahore",
        name: "DHA Phase 5",
        address: "DHA Phase 5",
        city: "Lahore",
        country: "Pakistan",
        // Premium location — slightly higher pricing.
        menu: [
          { dishId: "beef-burger", available: true, price: 1390 },
          { dishId: "crispy-chicken", available: true, price: 1290 },
        ],
      },
      {
        id: "airport-express",
        name: "Airport Express",
        address: "Islamabad Int'l Airport, Departures",
        city: "Islamabad",
        country: "Pakistan",
        // Express kiosk — burgers only.
        menu: [
          { dishId: "beef-burger", available: true, price: 1490 },
          { dishId: "crispy-chicken", available: false },
        ],
      },
    ],
  },
];

export const restaurantsBySlug = new Map(
  restaurants.map((restaurant) => [restaurant.slug, restaurant]),
);

export function getDefaultRestaurant() {
  return restaurants[0];
}

export function getRestaurantBySlug(slug: string) {
  return restaurantsBySlug.get(slug);
}

export function getRestaurantBranch(slug: string, branchId?: string) {
  const restaurant = getRestaurantBySlug(slug);

  if (!restaurant) {
    return null;
  }

  const resolvedBranchId = branchId ?? restaurant.defaultBranchId;

  return (
    restaurant.branches.find((branch) => branch.id === resolvedBranchId) ??
    restaurant.branches.find(
      (branch) => branch.id === restaurant.defaultBranchId,
    ) ??
    restaurant.branches[0] ??
    null
  );
}

/**
 * Resolves the dishes a branch actually serves, in menu order, with per-branch
 * price overrides applied. Falls back to the full base menu when no branch is
 * given (e.g. a brand-level link with no location).
 */
export function getBranchMenu(
  slug: string,
  branch: RestaurantBranch | null,
): MenuDish[] {
  const restaurant = getRestaurantBySlug(slug);

  if (!restaurant) {
    return [];
  }

  if (!branch) {
    return restaurant.dishes.map((dish) => ({ ...dish }));
  }

  const dishesById = new Map(restaurant.dishes.map((dish) => [dish.id, dish]));

  return branch.menu
    .filter((item) => item.available)
    .map((item) => {
      const dish = dishesById.get(item.dishId);

      if (!dish) {
        return null;
      }

      return { ...dish, price: item.price ?? dish.price };
    })
    .filter((dish): dish is MenuDish => dish !== null);
}

export function getDishById(restaurantSlug: string, dishId: string) {
  const restaurant = getRestaurantBySlug(restaurantSlug);

  if (!restaurant) {
    return null;
  }

  return restaurant.dishes.find((dish) => dish.id === dishId) ?? null;
}
