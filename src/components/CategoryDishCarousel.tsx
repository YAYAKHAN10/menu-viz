"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import DishModel from "@/components/DishModel";
import { useModelPreloader } from "@/hooks/useModelPreloader";
import { trackMenuEvent } from "@/lib/analytics";
import type { Dish, Restaurant, RestaurantBranch } from "@/types/restaurant";

type CategoryDishCarouselProps = {
  restaurant: Restaurant;
  branch: RestaurantBranch | null;
};

type MenuSection = {
  category: string;
  dishes: Dish[];
};

const categoryOrder = ["Starters", "Grill", "Mains", "Desserts", "Drinks"];
const defaultRotation = {
  azimuth: -18,
  polar: 66,
};

export default function CategoryDishCarousel({
  restaurant,
  branch,
}: CategoryDishCarouselProps) {
  const sections = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          dishes: restaurant.dishes
            .filter((dish) => dish.category === category)
            .sort((firstDish, secondDish) => {
              if (firstDish.modelUrl && !secondDish.modelUrl) {
                return -1;
              }

              if (!firstDish.modelUrl && secondDish.modelUrl) {
                return 1;
              }

              return 0;
            }),
        }))
        .filter((section) => section.dishes.length > 0),
    [restaurant.dishes],
  );

  const [mode, setMode] = useState<"categories" | "dishes">("categories");
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [dishIndex, setDishIndex] = useState(0);
  const [rotation, setRotation] = useState(defaultRotation);
  const swipeRef = useRef({
    startX: 0,
    startY: 0,
    active: false,
  });
  const rotateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startRotation: defaultRotation,
    startTime: 0,
    moved: false,
  });

  const section = sections[categoryIndex] ?? sections[0];
  const dish =
    mode === "categories"
      ? section.dishes[0]
      : (section.dishes[dishIndex] ?? section.dishes[0]);
  const analyticsContext = useMemo(
    () => ({
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      branchId: branch?.id,
      branchName: branch?.name,
    }),
    [branch?.id, branch?.name, restaurant.name, restaurant.slug],
  );
  const nearbyModelUrls = useMemo(
    () =>
      getNearbyModelUrls({
        mode,
        sections,
        categoryIndex,
        dishIndex,
      }),
    [mode, sections, categoryIndex, dishIndex],
  );
  const dishAnalyticsContext = useMemo(
    () => ({
      ...analyticsContext,
      category: section.category,
      dishId: dish.id,
      dishName: dish.name,
      modelUrl: dish.modelUrl,
    }),
    [analyticsContext, dish.id, dish.modelUrl, dish.name, section.category],
  );

  useModelPreloader(nearbyModelUrls, analyticsContext);

  useEffect(() => {
    if (mode === "categories") {
      trackMenuEvent("category_viewed", {
        ...analyticsContext,
        category: section.category,
        dishId: dish.id,
        dishName: dish.name,
        mode,
      });
      return;
    }

    trackMenuEvent("dish_viewed", {
      ...analyticsContext,
      category: section.category,
      dishId: dish.id,
      dishName: dish.name,
      mode,
    });
  }, [analyticsContext, dish.id, dish.name, mode, section.category]);

  function move(direction: 1 | -1) {
    trackMenuEvent("menu_navigation", {
      ...analyticsContext,
      category: section.category,
      dishId: dish.id,
      dishName: dish.name,
      direction: direction === 1 ? "next" : "previous",
      mode,
    });

    if (mode === "categories") {
      setCategoryIndex((current) =>
        clampIndex(current + direction, sections.length),
      );
      setDishIndex(0);
      setRotation(defaultRotation);
      return;
    }

    setDishIndex((current) =>
      clampIndex(current + direction, section.dishes.length),
    );
    setRotation(defaultRotation);
  }

  function openCategory() {
    if (mode === "categories") {
      trackMenuEvent("category_opened", {
        ...analyticsContext,
        category: section.category,
        dishId: dish.id,
        dishName: dish.name,
      });
      setMode("dishes");
      setDishIndex(0);
      setRotation(defaultRotation);
    }
  }

  function backToCategories() {
    setMode("categories");
    setDishIndex(0);
    setRotation(defaultRotation);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    swipeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      active: true,
    };
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!swipeRef.current.active) {
      return;
    }

    const deltaX = event.clientX - swipeRef.current.startX;
    const deltaY = event.clientY - swipeRef.current.startY;
    swipeRef.current.active = false;

    if (Math.abs(deltaX) < 96 || Math.abs(deltaY) > 54) {
      return;
    }

    move(deltaX < 0 ? 1 : -1);
  }

  function handleModelPointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    rotateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotation,
      startTime: performance.now(),
      moved: false,
    };
  }

  function handleModelPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!rotateRef.current.active) {
      return;
    }

    event.stopPropagation();
    const deltaX = event.clientX - rotateRef.current.startX;
    const deltaY = event.clientY - rotateRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      rotateRef.current.moved = true;
    }

    setRotation({
      azimuth: rotateRef.current.startRotation.azimuth + deltaX * 0.72,
      polar: clamp(
        rotateRef.current.startRotation.polar - deltaY * 0.5,
        6,
        174,
      ),
    });
  }

  function handleModelPointerUp(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const deltaX = event.clientX - rotateRef.current.startX;
    const deltaY = event.clientY - rotateRef.current.startY;
    const elapsed = Math.max(
      performance.now() - rotateRef.current.startTime,
      1,
    );
    const velocity = Math.abs(deltaX) / elapsed;
    const isForcefulSwipe =
      Math.abs(deltaX) > 168 ||
      (Math.abs(deltaX) > 128 && velocity > 0.9 && Math.abs(deltaY) < 58);
    const wasTap = !rotateRef.current.moved;
    rotateRef.current.active = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (isForcefulSwipe) {
      move(deltaX < 0 ? 1 : -1);
      return;
    }

    if (wasTap) {
      openCategory();
    }
  }

  if (!section || !dish) {
    return null;
  }

  const modelStyle = {
    "--model-accent": dish.modelColors.accent,
  } as CSSProperties;

  return (
    <div
      className="absolute inset-0 z-10 flex touch-pan-y flex-col items-center justify-center px-5 pt-20 pb-8 select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipeRef.current.active = false;
      }}
    >
      {mode === "dishes" && (
        <button
          type="button"
          onClick={backToCategories}
          className="absolute top-20 left-5 z-30 inline-flex items-center gap-2 rounded-full border border-white/16 bg-black/24 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-white/72 uppercase shadow-lg shadow-black/20 backdrop-blur-md active:bg-white/12"
        >
          <span aria-hidden="true">{"<"}</span>
          Categories
        </button>
      )}

      <div className="absolute inset-x-5 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between">
        <button
          type="button"
          onClick={() => move(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-black/20 text-2xl font-light text-white/62 shadow-lg shadow-black/20 backdrop-blur-md active:bg-white/12"
          aria-label="Previous item"
        >
          {"<"}
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-black/20 text-2xl font-light text-white/62 shadow-lg shadow-black/20 backdrop-blur-md active:bg-white/12"
          aria-label="Next item"
        >
          {">"}
        </button>
      </div>

      <button
        type="button"
        onPointerDown={handleModelPointerDown}
        onPointerMove={handleModelPointerMove}
        onPointerUp={handleModelPointerUp}
        onPointerCancel={(event) => {
          rotateRef.current.active = false;

          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        className="relative flex h-[19rem] w-[19rem] touch-none items-center justify-center rounded-full border border-white/16 bg-white/8 shadow-2xl shadow-black/40 backdrop-blur-[2px] transition active:scale-[0.98] sm:h-[22rem] sm:w-[22rem]"
        aria-label={
          mode === "categories"
            ? `Open ${section.category} dishes`
            : `Selected dish ${dish.name}`
        }
      >
        <div className="absolute inset-8 rounded-full border border-white/12" />
        <div className="absolute inset-16 rounded-full border border-white/10" />
        {dish.modelUrl ? (
          <div className="menu-model menu-model-category" style={modelStyle}>
            <DishModel
              src={dish.modelUrl}
              alt={`${dish.name} 3D model`}
              rotation={rotation}
              analyticsContext={dishAnalyticsContext}
            />
          </div>
        ) : (
          <div className="menu-plate menu-plate-category" style={modelStyle}>
            <span />
            <span />
            <span />
          </div>
        )}
      </button>

      {mode === "categories" && (
        <p className="mt-4 rounded-full border border-white/14 bg-black/22 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-white/66 uppercase shadow-lg shadow-black/20 backdrop-blur-md">
          Tap dish to explore category
        </p>
      )}

      <div className="mt-8 w-full max-w-sm rounded-[1.75rem] border border-white/18 bg-black/24 p-4 text-center text-white shadow-2xl shadow-black/35 backdrop-blur-xl">
        <p className="text-xs font-semibold tracking-[0.24em] text-white/48 uppercase">
          {mode === "categories" ? "Category" : section.category}
        </p>
        <h1 className="mt-2 text-3xl leading-tight font-semibold">
          {mode === "categories" ? section.category : dish.name}
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/64">
          {mode === "categories"
            ? `${dish.name} represents this section.`
            : dish.subtitle}
        </p>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          {(mode === "categories" ? sections : section.dishes).map(
            (item, index) => (
              <span
                key={
                  mode === "categories"
                    ? (item as MenuSection).category
                    : (item as Dish).id
                }
                className={`h-1.5 rounded-full transition-all ${
                  index === (mode === "categories" ? categoryIndex : dishIndex)
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/32"
                }`}
              />
            ),
          )}
        </div>

        {mode === "dishes" && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-white/12 bg-white/8 p-3">
              <p className="text-[0.65rem] tracking-[0.16em] text-white/42 uppercase">
                Price
              </p>
              <p className="mt-1 text-sm font-semibold">Rs. {dish.price}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/8 p-3">
              <p className="text-[0.65rem] tracking-[0.16em] text-white/42 uppercase">
                Ready
              </p>
              <p className="mt-1 text-sm font-semibold">{dish.prepTime}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/8 p-3">
              <p className="text-[0.65rem] tracking-[0.16em] text-white/42 uppercase">
                Pair
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {dish.pairing}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function clampIndex(index: number, length: number) {
  if (length <= 0) {
    return 0;
  }

  return (index + length) % length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getNearbyModelUrls({
  mode,
  sections,
  categoryIndex,
  dishIndex,
}: {
  mode: "categories" | "dishes";
  sections: MenuSection[];
  categoryIndex: number;
  dishIndex: number;
}) {
  if (sections.length === 0) {
    return [];
  }

  const urls = new Set<string>();
  const currentSection = sections[categoryIndex] ?? sections[0];

  if (mode === "categories") {
    for (const offset of [-1, 0, 1]) {
      const section =
        sections[clampIndex(categoryIndex + offset, sections.length)];
      const modelUrl = section?.dishes[0]?.modelUrl;

      if (modelUrl) {
        urls.add(modelUrl);
      }
    }
  } else {
    for (const offset of [-1, 0, 1]) {
      const dish =
        currentSection.dishes[
          clampIndex(dishIndex + offset, currentSection.dishes.length)
        ];

      if (dish?.modelUrl) {
        urls.add(dish.modelUrl);
      }
    }

    const nextCategoryUrl =
      sections[clampIndex(categoryIndex + 1, sections.length)]?.dishes[0]
        ?.modelUrl;

    if (nextCategoryUrl) {
      urls.add(nextCategoryUrl);
    }
  }

  return [...urls];
}
