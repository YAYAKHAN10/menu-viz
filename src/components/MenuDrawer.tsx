"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { buildSections } from "@/lib/menu";
import type { MenuDish } from "@/types/restaurant";

// Fraction of the sheet's height a downward drag must cover to dismiss it.
const COMMIT_RATIO = 0.3;

type MenuDrawerProps = {
  dishes: MenuDish[];
  currency: string;
  restaurantName: string;
  activeDishId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDish: (dishId: string) => void;
};

/**
 * The full-menu sheet: rises from the bottom over the 3D viewer. A sticky
 * category chip bar (scroll-spy + tap-to-jump) handles many categories; each
 * section is a bold header + item count over rich rows (thumbnail, name,
 * descriptor, a highlight tag, price). Open is controlled by MenuShell.
 */
export default function MenuDrawer({
  dishes,
  currency,
  restaurantName,
  activeDishId,
  open,
  onOpenChange,
  onSelectDish,
}: MenuDrawerProps) {
  const sections = useMemo(() => buildSections(dishes), [dishes]);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const pillRef = useRef<HTMLSpanElement>(null);
  const pillReady = useRef(false);
  const dragRef = useRef({ active: false, startY: 0, travel: 0, moved: false });
  const [dragTy, setDragTy] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState(
    () => sections[0]?.category ?? "",
  );
  // The row stagger is a one-shot: fire it when the sheet opens, then clear it
  // (below) so re-renders while dragging the sheet can't restart it.
  const [revealRows, setRevealRows] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setRevealRows(open);
  }

  // Scroll-spy: highlight the category whose section sits at the top of the list.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || sections.length === 0) {
      return;
    }
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const category = entry.target.getAttribute("data-category");
          if (!category) {
            continue;
          }
          if (entry.isIntersecting) {
            visible.add(category);
          } else {
            visible.delete(category);
          }
        }
        const topmost = sections.find((section) => visible.has(section.category));
        if (topmost) {
          setActiveCategory(topmost.category);
        }
      },
      { root, rootMargin: "0px 0px -78% 0px", threshold: 0 },
    );
    for (const element of sectionRefs.current.values()) {
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  // Keep the active chip in view as it changes.
  useEffect(() => {
    chipRefs.current.get(activeCategory)?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeCategory]);

  // Clear the row-reveal flag once the stagger has finished playing.
  useEffect(() => {
    if (!revealRows) {
      return;
    }
    const timer = setTimeout(() => setRevealRows(false), 800);
    return () => clearTimeout(timer);
  }, [revealRows]);

  // Slide the category pill (tabs-sliding) onto the active chip — CSS owns the
  // tween, JS writes the measured box. First paint + resize snap without it.
  useEffect(() => {
    const pill = pillRef.current;
    const chip = chipRefs.current.get(activeCategory);
    if (!pill || !chip) {
      return;
    }
    const place = (animate: boolean) => {
      const write = () => {
        pill.style.transform = `translateX(${chip.offsetLeft}px)`;
        pill.style.width = `${chip.offsetWidth}px`;
        pill.style.height = `${chip.offsetHeight}px`;
        pill.style.top = `${chip.offsetTop}px`;
      };
      if (animate) {
        write();
      } else {
        const previous = pill.style.transition;
        pill.style.transition = "none";
        write();
        void pill.offsetWidth;
        pill.style.transition = previous;
      }
    };
    place(pillReady.current);
    pillReady.current = true;
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeCategory, sections]);

  function jumpToCategory(category: string) {
    setActiveCategory(category);
    sectionRefs.current
      .get(category)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function beginDrag(event: PointerEvent<HTMLElement>) {
    const travel = sheetRef.current?.offsetHeight ?? window.innerHeight;
    dragRef.current = {
      active: true,
      startY: event.clientY,
      travel,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragTy(0);
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag.active) {
      return;
    }
    const delta = event.clientY - drag.startY;
    if (Math.abs(delta) > 4) {
      drag.moved = true;
    }
    // Only downward drags dismiss; clamp to [0, travel].
    setDragTy(clamp(delta, 0, drag.travel));
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag.active) {
      return;
    }
    drag.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const delta = event.clientY - drag.startY;
    setDragTy(null);
    // A tap on the grabber, or a downward drag past the threshold, closes.
    if (!drag.moved || delta > drag.travel * COMMIT_RATIO) {
      onOpenChange(false);
    }
  }

  const dragging = dragTy != null;

  return (
    <>
      {/* Scrim over the stage while open — tap to close. */}
      <div
        aria-hidden
        onClick={() => onOpenChange(false)}
        className={`absolute inset-0 z-30 bg-black/50 transition-opacity duration-[250ms] ${
          open
            ? "opacity-100 backdrop-blur-[3px]"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* The menu sheet — rises from the bottom. */}
      <div
        ref={sheetRef}
        style={
          {
            viewTransitionName: open ? "menu-morph" : "none",
            ...(dragging
              ? { transform: `translateY(${dragTy}px)`, transition: "none" }
              : {}),
          } as CSSProperties
        }
        className={`absolute inset-x-4 bottom-4 z-40 mx-auto flex max-h-[84dvh] max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-bone/10 bg-[#0c0d10]/95 text-bone shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-opacity duration-200 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Drag handle — grabber + header; swipe down (or tap) to close. */}
        <div
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="shrink-0 touch-none"
        >
          <div className="flex justify-center pt-3 pb-1.5">
            <span className="h-1 w-10 rounded-full bg-bone/30" />
          </div>
          <header className="px-5 pb-2.5">
            <p className="text-xl font-normal tracking-[-0.01em]">
              {restaurantName}
            </p>
          </header>
        </div>

        {/* Category nav — scroll-spy + tap to jump. */}
        {sections.length > 1 && (
          <div className="no-scrollbar shrink-0 overflow-x-auto border-b border-bone/[0.06]">
            <div className="relative flex w-max gap-1.5 px-4 pt-1 pb-2.5">
              {/* The sliding active pill — JS writes its box, CSS tweens it. */}
              <span
                ref={pillRef}
                aria-hidden
                className="pointer-events-none absolute top-0 left-0 w-0 rounded-full bg-paper transition-[transform,width] duration-[250ms] ease-[var(--ease-out-quint)] motion-reduce:transition-none"
              />
              {sections.map((section) => {
                const on = section.category === activeCategory;
                return (
                  <button
                    key={section.category}
                    ref={(element) => {
                      if (element) {
                        chipRefs.current.set(section.category, element);
                      } else {
                        chipRefs.current.delete(section.category);
                      }
                    }}
                    type="button"
                    onClick={() => jumpToCategory(section.category)}
                    className={`relative z-10 flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-geist text-[0.7rem] font-medium tracking-[0.06em] uppercase transition-colors duration-[250ms] outline-none before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] focus-visible:ring-2 focus-visible:ring-bone/50 motion-safe:active:scale-[0.96] ${
                      on ? "text-void" : "text-mist"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors duration-[250ms] ${
                        on ? "bg-void/45" : "bg-bone/30"
                      }`}
                    />
                    {section.category}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          {sections.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-fog">
              This menu is coming online shortly.
            </p>
          ) : (
            sections.map((section) => (
              <section
                key={section.category}
                data-category={section.category}
                ref={(element) => {
                  if (element) {
                    sectionRefs.current.set(section.category, element);
                  } else {
                    sectionRefs.current.delete(section.category);
                  }
                }}
                className="scroll-mt-2"
              >
                <div className="flex items-baseline gap-2 px-5 pt-5 pb-2">
                  <h2 className="text-lg font-medium tracking-[-0.01em] text-bone">
                    {section.category}
                  </h2>
                  <span className="font-geist text-xs text-fog">
                    {section.dishes.length}{" "}
                    {section.dishes.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="divide-y divide-bone/[0.06]">
                  {section.dishes.map((dish) => (
                    <MenuRow
                      key={dish.id}
                      dish={dish}
                      currency={currency}
                      active={dish.id === activeDishId}
                      index={dishes.indexOf(dish)}
                      reveal={revealRows}
                      onSelect={() => {
                        onSelectDish(dish.id);
                        onOpenChange(false);
                      }}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function MenuRow({
  dish,
  currency,
  active,
  index,
  reveal,
  onSelect,
}: {
  dish: MenuDish;
  currency: string;
  active: boolean;
  index: number;
  reveal: boolean;
  onSelect: () => void;
}) {
  const tag = dish.highlights?.[0];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      style={{ "--i": index } as CSSProperties}
      className={`flex w-full items-start gap-3.5 px-5 py-3.5 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-bone/50 focus-visible:ring-inset ${
        active ? "bg-bone/[0.06]" : "active:bg-bone/[0.04]"
      } ${reveal ? "row-reveal" : ""}`}
    >
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-bone/[0.06] bg-ink"
        style={
          active ? { boxShadow: "0 0 0 1.5px rgba(229,229,229,0.5)" } : undefined
        }
      >
        {dish.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dish.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-geist text-lg font-medium text-mist">
            {dish.name.charAt(0)}
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-[0.95rem] font-medium text-bone">
            {dish.name}
          </span>
          <span className="shrink-0 font-geist text-sm font-medium text-mist tabular-nums">
            {currency} {dish.price}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-pretty text-mist">
          {dish.subtitle}
        </span>
        {tag && (
          <span className="mt-1.5 self-start rounded-full border border-bone/10 bg-char/60 px-2 py-0.5 font-geist text-[0.6rem] font-medium tracking-[0.04em] text-mist">
            {tag}
          </span>
        )}
      </span>
    </button>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
