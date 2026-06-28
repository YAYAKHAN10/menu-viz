import { dishModelUrl, dishUsdzUrl } from "@/lib/assets";
import type { Restaurant } from "@/types/restaurant";

// iOS Quick Look needs USDZ, which we don't have yet (only GLB). Flip to true
// once USDZ assets are generated and uploaded to R2 so iOS AR turns on without
// shipping a broken "View on my table" button.
const USDZ_READY = false;
const dishUsdz = (dishId: string) =>
  USDZ_READY ? dishUsdzUrl(dishId) : undefined;

export const restaurants: Restaurant[] = [
  {
    slug: "demo",
    name: "MenuViz Demo Grill",
    cuisine: "Fine dining grill",
    location: "Islamabad, Pakistan",
    defaultBranchId: "main",
    branches: [
      {
        id: "main",
        name: "Main Branch",
        address: "Demo dining room",
        city: "Islamabad",
        country: "Pakistan",
      },
    ],
    description:
      "A mobile-first dining menu where guests can open the full list instantly, then inspect selected dishes in 360 degrees or camera-based AR.",
    heroImageUrl: "/images/fine-dining-grill.png",
    rating: "4.8",
    dishes: [
      {
        id: "classic-burger",
        name: "Smoked Beef Burger",
        subtitle: "Charred beef, melted cheddar, house sauce",
        description:
          "A juicy grilled beef burger layered with cheddar, crisp lettuce, tomato, pickles, onions, and a bright house sauce on a glossy brioche bun.",
        price: 1299,
        category: "Grill",
        imageUrl: "/images/dishes/classic-burger.jpg",
        modelUrl: dishModelUrl("classic-burger"),
        iosModelUrl: dishUsdz("classic-burger"),
        prepTime: "14 min",
        pairing: "Citrus iced tea",
        highlights: ["Halal beef", "House sauce", "Best seller"],
        modelColors: {
          primary: "#c46f32",
          secondary: "#6f3f24",
          accent: "#86a85d",
        },
      },
      {
        id: "alfredo-pasta",
        name: "Creamy Chicken Pasta",
        subtitle: "Cream, parmesan, grilled chicken",
        description:
          "Rigatoni tossed in a silky Alfredo sauce with grilled chicken, aged parmesan, cracked pepper, basil, and a touch of chili oil.",
        price: 1499,
        category: "Mains",
        imageUrl: "/images/dishes/alfredo-pasta.jpg",
        modelUrl: dishModelUrl("alfredo-pasta"),
        iosModelUrl: dishUsdz("alfredo-pasta"),
        prepTime: "16 min",
        pairing: "Sparkling lime soda",
        highlights: ["Creamy", "Fresh basil", "AR ready"],
        modelColors: {
          primary: "#e6b15a",
          secondary: "#f3d7a2",
          accent: "#d95f3f",
        },
      },
      {
        id: "seekh-kebab",
        name: "Beef Seekh Kebab",
        subtitle: "Coal-fired skewers, mint chutney",
        description:
          "Hand-shaped beef kebabs grilled over coals with warm spices, pickled onions, and a cooling mint chutney.",
        price: 1590,
        category: "Grill",
        imageUrl: "/images/dishes/seekh-kebab.jpg",
        modelUrl: dishModelUrl("seekh-kebab"),
        iosModelUrl: dishUsdz("seekh-kebab"),
        prepTime: "18 min",
        pairing: "Mint lemonade",
        highlights: ["Coal fired", "Signature spice", "AR ready"],
        modelColors: {
          primary: "#7a3f26",
          secondary: "#c8874f",
          accent: "#69a35d",
        },
      },
      {
        id: "malai-boti",
        name: "Chicken Malai Boti",
        subtitle: "Cream marinade, charred edges",
        description:
          "Tender chicken boti marinated with cream, green chili, ginger, and cardamom, finished with a gentle grill char.",
        price: 1690,
        category: "Grill",
        imageUrl: "/images/dishes/malai-boti.jpg",
        modelUrl: dishModelUrl("malai-boti"),
        iosModelUrl: dishUsdz("malai-boti"),
        prepTime: "20 min",
        pairing: "Salted lassi",
        highlights: ["Creamy", "Mild spice", "Table favorite"],
        modelColors: {
          primary: "#d7aa6c",
          secondary: "#f3d9a8",
          accent: "#7d9a54",
        },
      },
      {
        id: "mutton-karahi",
        name: "Mutton Karahi",
        subtitle: "Tomato, ginger, green chili",
        description:
          "Slow-cooked mutton in a bright tomato masala with julienned ginger, green chili, coriander, and freshly cracked spices.",
        price: 2490,
        category: "Mains",
        imageUrl: "/images/dishes/mutton-karahi.jpg",
        modelUrl: dishModelUrl("mutton-karahi"),
        iosModelUrl: dishUsdz("mutton-karahi"),
        prepTime: "28 min",
        pairing: "Tandoori naan",
        highlights: ["Shareable", "Fresh masala", "AR ready"],
        modelColors: {
          primary: "#a63f28",
          secondary: "#de8a43",
          accent: "#5b8d4c",
        },
      },
      {
        id: "lahori-fish",
        name: "Lahori Fried Fish",
        subtitle: "Crisp spice crust, lemon",
        description:
          "Boneless fish fillets with a crisp Lahori spice crust, served with lemon, chaat masala, and tartar chutney.",
        price: 1890,
        category: "Starters",
        imageUrl: "/images/dishes/lahori-fish.jpg",
        modelUrl: dishModelUrl("lahori-fish"),
        iosModelUrl: dishUsdz("lahori-fish"),
        prepTime: "15 min",
        pairing: "Ginger soda",
        highlights: ["Crisp", "Light spice", "Share plate"],
        modelColors: {
          primary: "#c98935",
          secondary: "#f0c46b",
          accent: "#c7d166",
        },
      },
      {
        id: "burrata-chaat",
        name: "Burrata Chaat",
        subtitle: "Tomato chutney, sev, herbs",
        description:
          "Creamy burrata with tomato chutney, tamarind, crisp sev, herbs, and a delicate chaat masala finish.",
        price: 1390,
        category: "Starters",
        imageUrl: "/images/dishes/burrata-chaat.jpg",
        modelUrl: dishModelUrl("burrata-chaat"),
        iosModelUrl: dishUsdz("burrata-chaat"),
        prepTime: "10 min",
        pairing: "Pomegranate spritz",
        highlights: ["Fresh", "Modern chaat", "Vegetarian"],
        modelColors: {
          primary: "#f2e7cf",
          secondary: "#c94a35",
          accent: "#6fad65",
        },
      },
      {
        id: "chocolate-dessert",
        name: "Dark Chocolate Fondant",
        subtitle: "Dark chocolate, berries, cream",
        description:
          "A dense dark chocolate cake with whipped cream, berry compote, chocolate drizzle, and a crisp cocoa crumb for texture.",
        price: 899,
        category: "Desserts",
        imageUrl: "/images/dishes/chocolate-dessert.jpg",
        modelUrl: dishModelUrl("chocolate-dessert"),
        iosModelUrl: dishUsdz("chocolate-dessert"),
        prepTime: "8 min",
        pairing: "Single-origin espresso",
        highlights: ["Rich cocoa", "Berry finish", "Shareable"],
        modelColors: {
          primary: "#3a2119",
          secondary: "#7d3f32",
          accent: "#d94e6a",
        },
      },
      {
        id: "saffron-kheer",
        name: "Saffron Kheer",
        subtitle: "Pistachio, rose, cardamom",
        description:
          "Slow-cooked rice pudding scented with saffron and cardamom, finished with pistachio, rose petals, and silver leaf.",
        price: 790,
        category: "Desserts",
        imageUrl: "/images/dishes/saffron-kheer.jpg",
        modelUrl: dishModelUrl("saffron-kheer"),
        iosModelUrl: dishUsdz("saffron-kheer"),
        prepTime: "7 min",
        pairing: "Karak chai",
        highlights: ["Classic", "Saffron", "Comforting"],
        modelColors: {
          primary: "#f0cf84",
          secondary: "#fff0c8",
          accent: "#79a05d",
        },
      },
      {
        id: "mint-lemonade",
        name: "Mint Lemonade",
        subtitle: "Fresh mint, lemon, soda",
        description:
          "A bright chilled lemonade with fresh mint, lemon juice, light sugar syrup, and sparkling soda.",
        price: 490,
        category: "Drinks",
        imageUrl: "/images/dishes/mint-lemonade.jpg",
        modelUrl: dishModelUrl("mint-lemonade"),
        iosModelUrl: dishUsdz("mint-lemonade"),
        prepTime: "5 min",
        pairing: "Grilled mains",
        highlights: ["Refreshing", "Citrus", "Non-alcoholic"],
        modelColors: {
          primary: "#b6d36b",
          secondary: "#e9f3b2",
          accent: "#6fae5d",
        },
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

export function getDishById(restaurantSlug: string, dishId: string) {
  const restaurant = getRestaurantBySlug(restaurantSlug);

  if (!restaurant) {
    return null;
  }

  return restaurant.dishes.find((dish) => dish.id === dishId) ?? null;
}
