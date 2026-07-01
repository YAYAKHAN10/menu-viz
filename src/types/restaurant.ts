export type AddOnKind = "side" | "drink" | "extra" | "wrap";

/**
 * A toggleable add-on shown as its own model on the tray. When `modelUrl` is
 * absent the preview renders a labeled primitive placeholder, so the experience
 * works before real add-on GLBs exist.
 */
export type AddOn = {
  id: string;
  name: string;
  /** Price delta added to the dish when this add-on is selected. */
  price: number;
  kind: AddOnKind;
  modelUrl?: string;
  /** Placeholder tint used when no model is supplied. */
  placeholderColor?: string;
  /** Pre-selected by default (e.g. a default side). */
  defaultOn?: boolean;
};

/**
 * One choice within a {@link VariantGroup}. Structurally an add-on, but selected
 * single-choice (radio) rather than toggled, so picking one swaps the others out.
 */
export type VariantOption = {
  id: string;
  name: string;
  /** Price delta vs the dish base when this option is chosen (default 0). */
  price?: number;
  /** Drives the preview primitive when no model is supplied. */
  kind?: AddOnKind;
  modelUrl?: string;
  placeholderColor?: string;
};

/**
 * A single-select set of versions, e.g. "Side: Fries / Mashed potato / Salad".
 * Exactly one option is always chosen; that option is shown on the tray and
 * rolled into the price. Distinct from {@link AddOn}, which is additive.
 */
export type VariantGroup = {
  id: string;
  /** Label shown above the choices, e.g. "Side". */
  name: string;
  options: VariantOption[];
  /** Pre-selected option id; falls back to the first option when unset. */
  defaultOptionId?: string;
};

export type Dish = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  /** Base price in whole currency units (e.g. rupees). Branches may override. */
  price: number;
  category: string;
  /** Optional poster image; the live UI leads with the 3D model, not a photo. */
  imageUrl?: string;
  modelUrl?: string;
  iosModelUrl?: string;
  prepTime: string;
  pairing: string;
  highlights: string[];
  modelColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  /** Single-select version groups (e.g. choose a side). Exactly one per group. */
  variants?: VariantGroup[];
  /** Optional add-ons the diner can toggle (each its own model). */
  addOns?: AddOn[];
};

/** Per-branch availability and pricing for a dish (the location_items join). */
export type BranchMenuItem = {
  dishId: string;
  available: boolean;
  /** Overrides the dish base price at this branch when set. */
  price?: number;
};

export type RestaurantBranch = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  /** Which dishes this branch serves, and at what price. */
  menu: BranchMenuItem[];
};

export type Restaurant = {
  slug: string;
  name: string;
  cuisine: string;
  location: string;
  defaultBranchId: string;
  /** Currency symbol/prefix shown before prices, e.g. "Rs." or "$". */
  currency: string;
  branches: RestaurantBranch[];
  description: string;
  heroImageUrl: string;
  rating: string;
  dishes: Dish[];
};

/** A dish resolved for a specific branch: base dish + effective price. */
export type MenuDish = Dish & { price: number };

/**
 * The slice of restaurant data the diner UI needs — passed to client
 * components instead of the full Restaurant, so the whole menu/branch list
 * (including dishes a branch doesn't serve) never ships in the client payload.
 */
export type RestaurantMeta = Pick<
  Restaurant,
  "slug" | "name" | "currency" | "heroImageUrl"
>;

export function toRestaurantMeta(restaurant: Restaurant): RestaurantMeta {
  return {
    slug: restaurant.slug,
    name: restaurant.name,
    currency: restaurant.currency,
    heroImageUrl: restaurant.heroImageUrl,
  };
}
