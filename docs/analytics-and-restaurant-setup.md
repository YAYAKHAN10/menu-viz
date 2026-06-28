# Analytics and Restaurant Setup

## Analytics to Monitor

Use Vercel Analytics for page views and custom menu events, and Vercel Speed Insights for performance. In Vercel, open the project, then use the Analytics and Speed Insights tabs.

Core health metrics:

- `menu_session_started`: menu opened for a restaurant/branch.
- `camera_started`: app attempted to open the camera.
- `camera_live`: camera opened successfully. Watch success rate and `durationMs`.
- `camera_blocked`: user/browser blocked the camera. Watch this by browser/device.
- `camera_unsupported`: camera API unavailable.
- `category_viewed`: category carousel item shown.
- `category_opened`: user tapped a category.
- `dish_viewed`: dish carousel item shown.
- `menu_navigation`: user moved through categories/dishes.
- `model_load_started`: GLB loading began.
- `model_load_ready`: GLB became usable. Watch `durationMs`.
- `model_load_slow`: GLB took longer than expected.
- `model_load_error`: GLB failed to render.
- `model_preload_failed`: nearby model preload failed.

Problem signals to watch first:

- High `camera_blocked` compared with `camera_started`.
- Frequent `model_load_slow` for a specific `dishId` or `modelUrl`.
- Any repeated `model_load_error`.
- Long Speed Insights interaction or load times on mobile.

## Restaurant and Branch URLs

Each restaurant has a unique slug:

```txt
/restaurants/{restaurantSlug}
```

Each branch QR code can include a branch id:

```txt
/restaurants/{restaurantSlug}?branch={branchId}
```

Analytics events include `restaurantSlug`, `restaurantName`, `branchId`, and `branchName` so issues can be traced to a specific restaurant and branch.

## Adding a Restaurant

Add a new `Restaurant` entry to `src/data/restaurant.ts`.

Required restaurant fields:

- `slug`: stable URL identifier.
- `name`, `cuisine`, `location`, `description`, `heroImageUrl`, `rating`.
- `defaultBranchId`.
- `branches`: one or more branch records.
- `dishes`: the restaurant menu.

Required dish fields:

- `id`: stable dish identifier.
- `category`: used by the carousel.
- `modelUrl`: GLB path in `public/models/dishes` or a CDN URL.
- `iosModelUrl`: future USDZ path for iOS AR.
- menu display fields such as `name`, `subtitle`, `price`, `prepTime`, and `pairing`.

Keep model filenames stable after deployment because `/models/*` uses long-lived immutable caching.
