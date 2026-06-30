"use client";

import dynamic from "next/dynamic";
import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from "react";
import DishCapture, { type CaptureResult } from "@/components/DishCapture";
import { trackMenuEvent } from "@/lib/analytics";
import { canLaunchAr, detectArCapability, launchAr } from "@/lib/ar";
import { composeShareImage } from "@/lib/composeShareImage";
import type {
  AddOn,
  MenuDish,
  RestaurantBranch,
  RestaurantMeta,
  VariantGroup,
  VariantOption,
} from "@/types/restaurant";

const DishStage = dynamic(() => import("@/components/DishStage"), {
  ssr: false,
});

type MenuStageProps = {
  restaurant: RestaurantMeta;
  branch: RestaurantBranch | null;
  dishes: MenuDish[];
  initialDishId?: string;
  getBackgroundFrame?: () => string | null;
};

type MenuSection = { category: string; dishes: MenuDish[] };

const defaultRotation = { azimuth: -22, polar: 70 };
const emptySubscribe = () => () => {};

export default function MenuStage({
  restaurant,
  branch,
  dishes,
  initialDishId,
  getBackgroundFrame,
}: MenuStageProps) {
  const sections = useMemo(() => buildSections(dishes), [dishes]);
  const initial = findInitialPosition(sections, initialDishId);

  const [categoryIndex, setCategoryIndex] = useState(
    initial?.categoryIndex ?? 0,
  );
  const [dishIndex, setDishIndex] = useState(initial?.dishIndex ?? 0);
  const [rotation, setRotation] = useState(defaultRotation);
  const [selectionByDish, setSelectionByDish] = useState<
    Record<string, string[]>
  >({});
  // Per-dish, per-group chosen variant option id (dishId → groupId → optionId).
  const [variantByDish, setVariantByDish] = useState<
    Record<string, Record<string, string>>
  >({});
  const [customizing, setCustomizing] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<
    "composing" | "ready" | "error"
  >("composing");
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(
    null,
  );

  const captureFnRef = useRef<(() => string | null) | null>(null);
  const categorySwipeRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    swiped: false,
  });
  const rotateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startRotation: defaultRotation,
    startTime: 0,
    moved: false,
  });

  // Client-only flag (avoids hydration mismatch on the UA-derived AR button).
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const section = sections[categoryIndex] ?? sections[0];
  const dish = section?.dishes[dishIndex] ?? section?.dishes[0];

  const analyticsContext = useMemo(
    () => ({
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      branchId: branch?.id,
      branchName: branch?.name,
    }),
    [branch?.id, branch?.name, restaurant.name, restaurant.slug],
  );

  if (!section || !dish) {
    return null;
  }

  const variantGroups = dish.variants ?? [];
  const addOns = dish.addOns ?? [];
  const variantSelection = variantByDish[dish.id] ?? {};
  const selectedIds = selectionByDish[dish.id] ?? defaultAddOnIds(dish);

  // The chosen option from each variant group (one per group, always present).
  const selectedVariantOptions = variantGroups
    .map((group) => selectedVariantOption(group, variantSelection[group.id]))
    .filter((option): option is VariantOption => option !== null);
  const toggledAddOns = addOns.filter((addOn) =>
    selectedIds.includes(addOn.id),
  );

  // The tray list driving both the live preview and (future combo-baked) AR:
  // each chosen variant option, then the additive add-ons.
  const trayAddOns: AddOn[] = [
    ...selectedVariantOptions.map(variantOptionToAddOn),
    ...toggledAddOns,
  ];
  const customizable = variantGroups.length > 0 || addOns.length > 0;
  const totalPrice =
    dish.price + trayAddOns.reduce((sum, item) => sum + item.price, 0);

  const arCapable = isClient && detectArCapability() !== "none";
  const arReady = isClient && canLaunchAr(dish);

  const dishContext = {
    ...analyticsContext,
    category: section.category,
    dishId: dish.id,
    dishName: dish.name,
    modelUrl: dish.modelUrl,
  };

  function moveItem(direction: 1 | -1) {
    const length = section.dishes.length;
    trackMenuEvent("menu_navigation", {
      ...dishContext,
      direction: direction === 1 ? "next" : "previous",
      mode: "dishes",
    });
    setDishIndex((current) => (current + direction + length) % length);
    setRotation(defaultRotation);
    setCustomizing(false);
  }

  function selectCategory(index: number) {
    if (index === categoryIndex) {
      return;
    }

    trackMenuEvent("category_opened", {
      ...analyticsContext,
      category: sections[index]?.category,
    });
    setCategoryIndex(index);
    setDishIndex(0);
    setRotation(defaultRotation);
    setCustomizing(false);
  }

  function stepCategory(direction: 1 | -1) {
    const length = sections.length;
    selectCategory((categoryIndex + direction + length) % length);
  }

  // Swipe the centered category strip left/right to change category. Plain
  // taps fall through to each label's onClick (no pointer capture here).
  function onCategoryDown(event: PointerEvent<HTMLDivElement>) {
    categorySwipeRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      swiped: false,
    };
  }

  function onCategoryUp(event: PointerEvent<HTMLDivElement>) {
    if (!categorySwipeRef.current.active || sections.length <= 1) {
      categorySwipeRef.current.active = false;
      return;
    }

    const deltaX = event.clientX - categorySwipeRef.current.startX;
    const deltaY = event.clientY - categorySwipeRef.current.startY;
    categorySwipeRef.current.active = false;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      // Mark the gesture so the button's trailing click doesn't override it.
      categorySwipeRef.current.swiped = true;
      stepCategory(deltaX < 0 ? 1 : -1);
    }
  }

  function onCategoryClick(index: number) {
    if (categorySwipeRef.current.swiped) {
      categorySwipeRef.current.swiped = false;
      return;
    }
    selectCategory(index);
  }

  function toggleAddOn(addOn: AddOn) {
    setSelectionByDish((previous) => {
      const current = previous[dish.id] ?? defaultAddOnIds(dish);
      const next = current.includes(addOn.id)
        ? current.filter((id) => id !== addOn.id)
        : [...current, addOn.id];
      return { ...previous, [dish.id]: next };
    });
    trackMenuEvent("addon_toggled", {
      ...dishContext,
      reason: addOn.id,
    });
  }

  function selectVariant(group: VariantGroup, option: VariantOption) {
    setVariantByDish((previous) => ({
      ...previous,
      [dish.id]: { ...previous[dish.id], [group.id]: option.id },
    }));
    trackMenuEvent("variant_selected", {
      ...dishContext,
      reason: `${group.id}:${option.id}`,
    });
  }

  function startAr() {
    trackMenuEvent("ar_launched", dishContext);
    const ok = launchAr(dish, trayAddOns);

    if (!ok) {
      void openCapture();
    }
  }

  async function openCapture() {
    trackMenuEvent("capture_open", dishContext);
    setCaptureResult(null);
    setCaptureStatus("composing");
    setCaptureOpen(true);

    const dishDataUrl = captureFnRef.current?.() ?? null;

    if (!dishDataUrl) {
      trackMenuEvent("capture_failed", { ...dishContext, reason: "no-frame" });
      setCaptureStatus("error");
      return;
    }

    try {
      const blob = await composeShareImage({
        dishDataUrl,
        backgroundDataUrl: getBackgroundFrame?.() ?? null,
        restaurantName: restaurant.name,
        dishName: dish.name,
        price: totalPrice,
        accent: dish.modelColors.accent,
      });
      setCaptureResult({ blob, previewUrl: URL.createObjectURL(blob) });
      setCaptureStatus("ready");
      trackMenuEvent("capture_taken", dishContext);
    } catch (error) {
      trackMenuEvent("capture_failed", {
        ...dishContext,
        reason: error instanceof Error ? error.name : "compose",
      });
      setCaptureStatus("error");
    }
  }

  function closeCapture() {
    setCaptureOpen(false);
    setCaptureResult((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
  }

  function handleShared(channel: string) {
    trackMenuEvent("share", { ...dishContext, source: channel });
  }

  // --- gestures: drag rotates, a forceful horizontal flick changes item,
  // a clean tap opens the customizer ---------------------------------------
  function onStageDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    rotateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotation,
      startTime: event.timeStamp,
      moved: false,
    };
  }

  function onStageMove(event: PointerEvent<HTMLDivElement>) {
    if (!rotateRef.current.active) {
      return;
    }

    const deltaX = event.clientX - rotateRef.current.startX;
    const deltaY = event.clientY - rotateRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      rotateRef.current.moved = true;
    }

    setRotation({
      azimuth: rotateRef.current.startRotation.azimuth + deltaX * 0.6,
      polar: clamp(
        rotateRef.current.startRotation.polar - deltaY * 0.4,
        35,
        100,
      ),
    });
  }

  function onStageUp(event: PointerEvent<HTMLDivElement>) {
    const deltaX = event.clientX - rotateRef.current.startX;
    const deltaY = event.clientY - rotateRef.current.startY;
    const elapsed = Math.max(event.timeStamp - rotateRef.current.startTime, 1);
    const velocity = Math.abs(deltaX) / elapsed;
    const forcefulSwipe =
      Math.abs(deltaX) > 150 ||
      (Math.abs(deltaX) > 110 && velocity > 0.85 && Math.abs(deltaY) < 60);
    const wasTap = !rotateRef.current.moved;
    rotateRef.current.active = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (forcefulSwipe && section.dishes.length > 1) {
      moveItem(deltaX < 0 ? 1 : -1);
      return;
    }

    if (wasTap && customizable) {
      setCustomizing((open) => !open);
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col px-4 pt-16 pb-6 select-none">
      {/* Category strip — centered + swipeable */}
      {sections.length > 1 && (
        <div
          className="flex shrink-0 touch-pan-y items-center justify-center gap-1.5"
          onPointerDown={onCategoryDown}
          onPointerUp={onCategoryUp}
          onPointerCancel={() => {
            categorySwipeRef.current.active = false;
          }}
        >
          {sections.map((item, index) => (
            <button
              key={item.category}
              type="button"
              onClick={() => onCategoryClick(index)}
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.16em] uppercase transition outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                index === categoryIndex
                  ? "bg-white text-black"
                  : "text-white/45 active:text-white/70"
              }`}
            >
              {item.category}
            </button>
          ))}
        </div>
      )}

      {/* 3D stage */}
      <div className="relative min-h-0 flex-1">
        <DishStage
          dish={dish}
          selectedAddOns={trayAddOns}
          rotation={rotation}
          registerCapture={(fn) => {
            captureFnRef.current = fn;
          }}
        />

        {/* Interaction overlay (routes gestures so the canvas stays passive) */}
        <div
          className="absolute inset-0 touch-none"
          onPointerDown={onStageDown}
          onPointerMove={onStageMove}
          onPointerUp={onStageUp}
          onPointerCancel={() => {
            rotateRef.current.active = false;
          }}
        />

        {section.dishes.length > 1 && (
          <div className="pointer-events-none absolute inset-x-1 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between">
            <button
              type="button"
              onClick={() => moveItem(-1)}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-black/24 text-2xl font-light text-white/64 shadow-lg shadow-black/20 backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:bg-white/12"
              aria-label="Previous item"
            >
              {"<"}
            </button>
            <button
              type="button"
              onClick={() => moveItem(1)}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-black/24 text-2xl font-light text-white/64 shadow-lg shadow-black/20 backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:bg-white/12"
              aria-label="Next item"
            >
              {">"}
            </button>
          </div>
        )}

        {customizable && (
          <p className="pointer-events-none absolute inset-x-0 bottom-1 z-20 mx-auto w-fit rounded-full border border-white/14 bg-black/24 px-4 py-2 text-center text-xs font-semibold tracking-[0.14em] text-white/64 uppercase backdrop-blur-md">
            {customizing ? "Drag to rotate" : "Tap dish to customize"}
          </p>
        )}
      </div>

      {/* Compact info + customize + actions */}
      <div className="mt-3 w-full shrink-0 rounded-3xl border border-white/14 bg-black/35 px-4 py-3 text-white backdrop-blur-xl">
        {section.dishes.length > 1 && (
          <div className="mb-2.5 flex justify-center gap-1.5">
            {section.dishes.map((item, index) => (
              <span
                key={item.id}
                className={`h-1.5 rounded-full transition-all ${
                  index === dishIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-lg font-semibold">
            {dish.name}
          </h1>
          <p className="shrink-0 text-base font-semibold tabular-nums">
            {restaurant.currency} {totalPrice}
          </p>
        </div>

        {/* Customizer — appears when the dish is tapped */}
        {customizing && customizable && (
          <div className="mt-3 space-y-3">
            {/* Single-select versions (one per group, e.g. choose a side) */}
            {variantGroups.map((group) => {
              const chosenId =
                variantSelection[group.id] ?? defaultVariantOptionId(group);
              return (
                <div key={group.id}>
                  <p className="mb-1.5 text-[0.6rem] font-semibold tracking-[0.18em] text-white/45 uppercase">
                    {group.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => {
                      const on = option.id === chosenId;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => selectVariant(group, option)}
                          aria-pressed={on}
                          className={`rounded-full border px-3 py-2 text-xs font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                            on
                              ? "border-white/30 bg-white/90 text-black"
                              : "border-white/16 bg-white/[0.06] text-white/78 active:bg-white/12"
                          }`}
                        >
                          {option.name}
                          {option.price ? (
                            <span
                              className={on ? "text-black/55" : "text-white/45"}
                            >
                              {" "}
                              +{restaurant.currency} {option.price}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Additive extras (toggle on/off) */}
            {addOns.length > 0 && (
              <div>
                {variantGroups.length > 0 && (
                  <p className="mb-1.5 text-[0.6rem] font-semibold tracking-[0.18em] text-white/45 uppercase">
                    Extras
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {addOns.map((addOn) => {
                    const on = selectedIds.includes(addOn.id);
                    return (
                      <button
                        key={addOn.id}
                        type="button"
                        onClick={() => toggleAddOn(addOn)}
                        aria-pressed={on}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                          on
                            ? "border-white/30 bg-white/90 text-black"
                            : "border-white/16 bg-white/[0.06] text-white/78 active:bg-white/12"
                        }`}
                      >
                        {addOn.name}
                        <span
                          className={on ? "text-black/55" : "text-white/45"}
                        >
                          {" "}
                          +{restaurant.currency} {addOn.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2.5">
          {arCapable && (
            <button
              type="button"
              onClick={startAr}
              disabled={!arReady}
              className="flex-1 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:bg-white/90 disabled:opacity-50 motion-safe:active:scale-[0.99]"
            >
              View on my table
            </button>
          )}
          <button
            type="button"
            onClick={openCapture}
            className={`rounded-full text-sm font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-white/60 motion-safe:active:scale-[0.99] ${
              arCapable
                ? "border border-white/18 bg-white/10 px-4 py-3 text-white/90 active:bg-white/16"
                : "flex-1 bg-white px-4 py-3 text-black active:bg-white/90"
            }`}
          >
            Share a photo
          </button>
        </div>
      </div>

      {captureOpen && (
        <DishCapture
          status={captureStatus}
          result={captureResult}
          dishName={dish.name}
          shareText={`${dish.name} at ${restaurant.name} — menuviz.app`}
          onClose={closeCapture}
          onShared={handleShared}
        />
      )}
    </div>
  );
}

function buildSections(dishes: MenuDish[]): MenuSection[] {
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

function defaultAddOnIds(dish: MenuDish): string[] {
  return (dish.addOns ?? [])
    .filter((addOn) => addOn.defaultOn)
    .map((addOn) => addOn.id);
}

function defaultVariantOptionId(group: VariantGroup): string | undefined {
  return group.defaultOptionId ?? group.options[0]?.id;
}

/** The chosen option for a group (the selected id, else the group default). */
function selectedVariantOption(
  group: VariantGroup,
  chosenId: string | undefined,
): VariantOption | null {
  const id = chosenId ?? defaultVariantOptionId(group);
  return group.options.find((option) => option.id === id) ?? null;
}

/** Adapts a variant option to the AddOn shape the tray/preview consumes. */
function variantOptionToAddOn(option: VariantOption): AddOn {
  return {
    id: option.id,
    name: option.name,
    price: option.price ?? 0,
    kind: option.kind ?? "side",
    modelUrl: option.modelUrl,
    placeholderColor: option.placeholderColor,
  };
}

function findInitialPosition(
  sections: MenuSection[],
  initialDishId: string | undefined,
) {
  if (!initialDishId) {
    return null;
  }

  for (let categoryIdx = 0; categoryIdx < sections.length; categoryIdx++) {
    const dishIdx = sections[categoryIdx].dishes.findIndex(
      (dish) => dish.id === initialDishId,
    );

    if (dishIdx >= 0) {
      return { categoryIndex: categoryIdx, dishIndex: dishIdx };
    }
  }

  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
