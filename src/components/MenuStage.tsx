"use client";

import dynamic from "next/dynamic";
import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent,
} from "react";
import DishCapture, { type CaptureResult } from "@/components/DishCapture";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Cube,
  Menu,
  Plus,
  Share,
} from "@/components/icons";
import { trackMenuEvent } from "@/lib/analytics";
import { canLaunchAr, detectArCapability, launchAr } from "@/lib/ar";
import { composeShareImage } from "@/lib/composeShareImage";
import { neighbourDishId, resolveActiveDish } from "@/lib/menu";
import { withViewTransition } from "@/lib/viewTransition";
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
  /** The dish currently shown in the viewer (controlled by MenuShell). */
  activeDishId: string;
  /** Select a different dish (drives both the swipe flick and the menu sheet). */
  onSelectDish: (dishId: string) => void;
  /** Whether the full-menu sheet is open (the pill morphs into it). */
  menuOpen: boolean;
  /** Open the full-menu bottom sheet. */
  onOpenMenu: () => void;
};

const defaultRotation = { azimuth: -22, polar: 70 };

// Pitch lock: yaw (azimuth) spins freely so every side is visible, but pitch
// (polar) is clamped to a top-biased band so you only ever see the top + sides
// of a dish, never its underside. This holds for every GLB because DishStage
// normalizes them all to the same pose (centered, bottom resting on y=0), so
// "up" is consistent — assuming the GLB is authored right-side-up.
// `polar - 66` is the tilt in degrees, so this band is roughly -8°…+26°.
const MIN_POLAR = 58;
const MAX_POLAR = 92;
const emptySubscribe = () => () => {};

export default function MenuStage({
  restaurant,
  branch,
  dishes,
  activeDishId,
  onSelectDish,
  menuOpen,
  onOpenMenu,
}: MenuStageProps) {
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
  const [prevActiveDishId, setPrevActiveDishId] = useState(activeDishId);

  const captureFnRef = useRef<(() => string | null) | null>(null);
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

  const analyticsContext = useMemo(
    () => ({
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      branchId: branch?.id,
      branchName: branch?.name,
    }),
    [branch?.id, branch?.name, restaurant.name, restaurant.slug],
  );

  // Re-centre the model and close the customizer when the active dish changes —
  // whether it was flicked on the stage or picked from the menu sheet. Adjusting
  // state during render on a prop change (React docs pattern), not an effect.
  if (activeDishId !== prevActiveDishId) {
    setPrevActiveDishId(activeDishId);
    setRotation(defaultRotation);
    setCustomizing(false);
  }

  const resolvedDish = resolveActiveDish(dishes, activeDishId);

  if (!resolvedDish) {
    return null;
  }

  // Narrowed alias so the gesture/handler closures below see a defined dish.
  const dish = resolvedDish;

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
  const multipleDishes = dishes.length > 1;

  const arCapable = isClient && detectArCapability() !== "none";
  const arReady = isClient && canLaunchAr(dish);

  const dishContext = {
    ...analyticsContext,
    category: dish.category,
    dishId: dish.id,
    dishName: dish.name,
    modelUrl: dish.modelUrl,
  };

  function moveItem(direction: 1 | -1) {
    trackMenuEvent("menu_navigation", {
      ...dishContext,
      direction: direction === 1 ? "next" : "previous",
      mode: "dishes",
    });
    const nextId = neighbourDishId(dishes, dish.id, direction);
    // Cinematic directional slide of the dish-stage box (see globals.css).
    withViewTransition(
      () => onSelectDish(nextId),
      direction === 1 ? "next" : "prev",
    );
  }

  function jumpToDish(id: string) {
    if (id === dish.id) {
      return;
    }
    const currentIndex = dishes.findIndex((item) => item.id === dish.id);
    const targetIndex = dishes.findIndex((item) => item.id === id);
    trackMenuEvent("menu_navigation", { ...dishContext, mode: "dishes" });
    withViewTransition(
      () => onSelectDish(id),
      targetIndex > currentIndex ? "next" : "prev",
    );
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

  function toggleCustomizing() {
    // View transition tweens the card box between collapsed and expanded.
    withViewTransition(() => setCustomizing((open) => !open));
  }

  function startAr() {
    trackMenuEvent("ar_launched", dishContext);
    // AR scope is variants-only (see lib/combo.ts); add-ons don't change the
    // baked combo, so only the variant selection is passed through.
    const ok = launchAr(dish, variantSelection);

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
        backgroundDataUrl: null,
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
        MIN_POLAR,
        MAX_POLAR,
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

    if (forcefulSwipe && multipleDishes) {
      moveItem(deltaX < 0 ? 1 : -1);
      return;
    }

    if (wasTap && customizable) {
      toggleCustomizing();
    }
  }

  return (
    <div className="no-scrollbar absolute inset-0 z-10 flex flex-col overflow-y-auto px-4 pt-16 pb-6 select-none">
      {/* 3D stage — a contained, square product viewer. Centered in the
          leftover space and capped so the model never overflows its box. */}
      <div className="relative flex min-h-[42dvh] flex-1 items-center justify-center py-3">
        {/* Edge nav — bare chevrons hugging the viewport edges. They sit OUTSIDE
            the dish-stage box so they stay put while the dish slides under. */}
        {multipleDishes && (
          <button
            type="button"
            onClick={() => moveItem(-1)}
            aria-label="Previous dish"
            className="text-bone/80 focus-visible:ring-bone/50 active:text-bone absolute top-1/2 -left-2 z-20 flex h-14 w-12 -translate-y-1/2 items-center justify-start transition outline-none focus-visible:ring-2 motion-safe:active:scale-90"
          >
            <ChevronLeft className="h-8 w-8 drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)]" />
          </button>
        )}

        <div
          style={{ viewTransitionName: "dish-stage" } as CSSProperties}
          className="relative aspect-square max-h-full w-full max-w-[20rem]"
        >
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
        </div>

        {multipleDishes && (
          <button
            type="button"
            onClick={() => moveItem(1)}
            aria-label="Next dish"
            className="text-bone/80 focus-visible:ring-bone/50 active:text-bone absolute top-1/2 -right-2 z-20 flex h-14 w-12 -translate-y-1/2 items-center justify-end transition outline-none focus-visible:ring-2 motion-safe:active:scale-90"
          >
            <ChevronRight className="h-8 w-8 drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)]" />
          </button>
        )}
      </div>

      {/* Position track — segments show which dish you're on; tap to jump. */}
      {multipleDishes && (
        <div className="mx-auto mt-2 flex shrink-0 items-center justify-center gap-1.5">
          {dishes.map((item) => {
            const isActive = item.id === dish.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpToDish(item.id)}
                aria-label={`View ${item.name}`}
                aria-current={isActive}
                className="group flex shrink-0 items-center py-2 outline-none"
              >
                <span
                  className={`h-1 rounded-full transition-[width,background-color] duration-300 ease-[var(--ease-out-quint)] ${
                    isActive
                      ? "bg-bone w-7"
                      : "bg-bone/25 group-active:bg-bone/40 w-3"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Compact info + customise + actions — a Dimension glass card that
          morphs open when "Customise" is tapped (shared view-transition). */}
      <div
        style={{ viewTransitionName: "dish-card" } as CSSProperties}
        className="border-bone/[0.08] bg-char/80 text-bone mx-auto mt-3 w-full max-w-md shrink-0 rounded-3xl border px-5 py-4 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
      >
        {/* Title block — eyebrow + name (full width), then a price row that
            carries the customise control (matched visual weight). */}
        <div key={dish.id} className="animate-dish-meta">
          <p className="font-geist text-fog text-[0.62rem] font-medium tracking-[0.2em] uppercase">
            {dish.category}
          </p>
          <h1 className="mt-1.5 text-[1.7rem] leading-[1.05] font-normal tracking-[-0.02em] text-balance">
            {dish.name}
          </h1>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="font-geist text-base font-medium tabular-nums">
              {restaurant.currency} {totalPrice}
            </span>
            {customizable && (
              <button
                type="button"
                onClick={toggleCustomizing}
                aria-expanded={customizing}
                className={`focus-visible:ring-bone/50 relative flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.72rem] leading-none font-medium transition outline-none before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] focus-visible:ring-2 motion-safe:active:scale-[0.96] ${
                  customizing
                    ? "bg-paper text-void border-transparent"
                    : "border-bone/10 bg-char/70 text-mist active:bg-iron/60"
                }`}
              >
                <span
                  className="t-icon-swap"
                  data-state={customizing ? "b" : "a"}
                >
                  <span className="t-icon" data-icon="a">
                    <Plus className="block h-3.5 w-3.5" />
                  </span>
                  <span className="t-icon" data-icon="b">
                    <Check className="block h-3.5 w-3.5" />
                  </span>
                </span>
                {customizing ? "Done" : "Customise"}
              </button>
            )}
          </div>
        </div>

        {/* Customise options — the card morphs open to reveal these. */}
        {customizable && customizing && (
          <div className="customise-options mt-4 space-y-3">
            {/* Single-select versions (one per group, e.g. choose a side) */}
            {variantGroups.map((group) => {
              const chosenId =
                variantSelection[group.id] ?? defaultVariantOptionId(group);
              return (
                <div key={group.id}>
                  <p className="font-geist text-fog mb-1.5 text-[0.6rem] font-medium tracking-[0.18em] uppercase">
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
                          className={`focus-visible:ring-bone/50 rounded-full border px-3.5 py-2 text-[0.8rem] font-medium transition outline-none focus-visible:ring-2 motion-safe:active:scale-[0.96] ${
                            on
                              ? "bg-paper text-void border-transparent"
                              : "border-bone/10 bg-char/70 text-mist active:bg-iron/60"
                          }`}
                        >
                          {option.name}
                          {option.price ? (
                            <span className={on ? "text-void/55" : "text-fog"}>
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
                  <p className="font-geist text-fog mb-1.5 text-[0.6rem] font-medium tracking-[0.18em] uppercase">
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
                        className={`focus-visible:ring-bone/50 rounded-full border px-3.5 py-2 text-[0.8rem] font-medium transition outline-none focus-visible:ring-2 ${
                          on
                            ? "bg-paper text-void border-transparent"
                            : "border-bone/10 bg-char/70 text-mist active:bg-iron/60"
                        }`}
                      >
                        {addOn.name}
                        <span className={on ? "text-void/55" : "text-fog"}>
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

        {/* Actions — white-pill primary, glass-pill secondary. */}
        <div className="mt-4 flex items-center gap-2.5">
          {arCapable ? (
            <>
              <button
                type="button"
                onClick={startAr}
                disabled={!arReady}
                className="bg-paper text-void focus-visible:ring-bone/60 active:bg-bone flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition outline-none focus-visible:ring-2 disabled:opacity-40 motion-safe:active:scale-[0.96]"
              >
                <Cube className="h-[1.1rem] w-[1.1rem]" />
                View on my table
              </button>
              <button
                type="button"
                onClick={openCapture}
                aria-label="Share a photo"
                className="border-bone/10 bg-char/70 text-bone focus-visible:ring-bone/50 active:bg-iron/60 flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition outline-none focus-visible:ring-2 motion-safe:active:scale-[0.96]"
              >
                <Share className="h-[1.1rem] w-[1.1rem]" />
                Share
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={openCapture}
              className="bg-paper text-void focus-visible:ring-bone/60 active:bg-bone flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition outline-none focus-visible:ring-2 motion-safe:active:scale-[0.96]"
            >
              <Share className="h-[1.1rem] w-[1.1rem]" />
              Share a photo
            </button>
          )}
        </div>
      </div>

      {/* Full menu — its box morphs into the menu sheet (shared view-transition). */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-expanded={menuOpen}
        style={
          {
            viewTransitionName: menuOpen ? "none" : "menu-morph",
          } as CSSProperties
        }
        className={`border-bone/10 bg-char/70 text-mist focus-visible:ring-bone/50 active:bg-iron/60 mx-auto mt-2.5 flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-[0.8rem] font-medium shadow-[0_8px_28px_rgba(0,0,0,0.4)] backdrop-blur-md transition-opacity duration-200 outline-none focus-visible:ring-2 motion-safe:active:scale-[0.96] ${
          menuOpen ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <Menu className="text-ash h-4 w-4" />
        Full menu
      </button>

      {captureOpen && (
        <DishCapture
          status={captureStatus}
          result={captureResult}
          dishName={dish.name}
          shareText={`${dish.name} at ${restaurant.name} · menuviz.app`}
          onClose={closeCapture}
          onShared={handleShared}
        />
      )}
    </div>
  );
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
