"use client";

import Link from "next/link";
import { useRef } from "react";
import type { UIEvent } from "react";
import type { Restaurant } from "@/types/restaurant";

type MenuDialProps = {
  restaurant: Restaurant;
};

const categoryOrder = ["Starters", "Grill", "Mains", "Desserts", "Drinks"];

export default function MenuDial({ restaurant }: MenuDialProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTickRef = useRef(0);

  const sections = categoryOrder
    .map((category) => ({
      category,
      dishes: restaurant.dishes.filter((dish) => dish.category === category),
    }))
    .filter((section) => section.dishes.length > 0);

  function tick() {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;

    if (context.state === "suspended") {
      void context.resume();
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = 980;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.028);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.03);
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const nextStep = Math.round(event.currentTarget.scrollTop / 34);

    if (nextStep !== lastTickRef.current) {
      lastTickRef.current = nextStep;
      tick();
    }
  }

  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-black/35 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-black/45 to-transparent" />

      <div
        onScroll={handleScroll}
        className="menu-scroll max-h-[68vh] overflow-y-auto rounded-[1.75rem] border border-white/18 bg-white/10 px-4 py-2 text-white shadow-2xl shadow-black/25 backdrop-blur-md"
      >
        {sections.map((section) => (
          <div key={section.category}>
            <div className="sticky top-0 z-10 -mx-4 border-y border-white/10 bg-black/20 px-4 py-3 text-xs font-semibold tracking-[0.28em] text-white/68 uppercase backdrop-blur-md">
              {section.category}
            </div>

            {section.dishes.map((dish) => (
              <Link
                key={dish.id}
                href={`/restaurants/${restaurant.slug}/dishes/${dish.id}`}
                className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/12 py-4 transition active:bg-white/10"
              >
                <span>
                  <span className="block text-[1.05rem] leading-6 font-semibold">
                    {dish.name}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-white/62">
                    {dish.subtitle}
                  </span>
                  <span className="mt-2 block text-xs font-medium tracking-[0.18em] text-white/45 uppercase">
                    {dish.prepTime} / 360 + AR
                  </span>
                </span>

                <span className="pt-1 text-right text-sm font-semibold text-white">
                  Rs. {dish.price}
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
