export type Dish = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
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
};

export type RestaurantBranch = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
};

export type Restaurant = {
  slug: string;
  name: string;
  cuisine: string;
  location: string;
  defaultBranchId: string;
  branches: RestaurantBranch[];
  description: string;
  heroImageUrl: string;
  rating: string;
  dishes: Dish[];
};
