"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { Reveal } from "@/components/reveal";
import { NETWORK_GALLERY } from "@/lib/content";

// Card geometry. The sticky wrapper is one card wide, so the first card starts
// centred and the strip scrolls left until the last card is centred.
const ITEM_WIDTH = 420;
const GAP = 30;
const ITEM_WIDTH_SM = 280;
const GAP_SM = 16;

export function Network() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Total travel = all cards minus the one already visible.
  const totalDistance = (NETWORK_GALLERY.length - 1) * (ITEM_WIDTH + GAP);
  const totalDistanceSm =
    (NETWORK_GALLERY.length - 1) * (ITEM_WIDTH_SM + GAP_SM);

  // Two transforms (desktop / mobile). We render both strips and toggle which
  // one is visible with Tailwind breakpoints, so each uses the right distance.
  const x = useTransform(scrollYProgress, [0, 1], [0, -totalDistance]);
  const xSm = useTransform(scrollYProgress, [0, 1], [0, -totalDistanceSm]);

  return (
    <section id="network" className="bg-ink text-white">
      {/* Intro / section header */}
      <div className="container-page pt-16 sm:pt-28">
        <Reveal>
          <p className="eyebrow text-white/50">Our Network</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="mt-4 max-w-4xl text-2xl font-medium leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Technology partnerships reaching every upazila
          </h2>
        </Reveal>
        <Reveal delay={2}>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
            Scroll to travel across the network — from local trust to nationwide
            reach.
          </p>
        </Reveal>
      </div>

      {/* Scroll-driven horizontal gallery. The tall container gives the sticky
          wrapper room to translate the strip as you scroll. */}
      <div ref={containerRef} className="relative h-[320vh]">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          {/* Desktop / tablet strip */}
          <motion.div
            style={{ x }}
            className="hidden gap-[30px] pl-[calc(50vw-210px)] will-change-transform sm:flex"
          >
            {NETWORK_GALLERY.map((item) => (
              <GalleryItem key={item.id} item={item} />
            ))}
          </motion.div>

          {/* Mobile strip */}
          <motion.div
            style={{ x: xSm }}
            className="flex gap-[16px] pl-[calc(50vw-140px)] will-change-transform sm:hidden"
          >
            {NETWORK_GALLERY.map((item) => (
              <GalleryItem key={item.id} item={item} small />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function GalleryItem({
  item,
  small = false,
}: {
  item: (typeof NETWORK_GALLERY)[number];
  small?: boolean;
}) {
  return (
    <figure
      className={`group relative shrink-0 overflow-hidden rounded-xl ${
        small ? "h-[350px] w-[280px]" : "h-[520px] w-[420px]"
      }`}
    >
      <Image
        src={item.img}
        alt={item.title}
        fill
        sizes={small ? "280px" : "420px"}
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
      {/* Colour gradient overlay */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, transparent 55%, ${item.color})`,
          mixBlendMode: "multiply",
        }}
      />
      {/* Dark scrim for text legibility */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"
      />
      <figcaption
        className={`absolute z-10 ${
          small ? "bottom-5 left-5 right-5" : "bottom-7 left-7 right-7"
        }`}
      >
        <span
          className="mb-1.5 block font-mono text-[11px] sm:mb-2 sm:text-xs"
          style={{ color: item.color }}
        >
          0{item.id}
        </span>
        <h3
          className={`font-semibold text-white ${
            small ? "text-lg" : "text-2xl"
          }`}
        >
          {item.title}
        </h3>
        <p
          className={`mt-1 text-white/70 ${small ? "text-xs" : "text-sm"}`}
        >
          {item.caption}
        </p>
      </figcaption>
    </figure>
  );
}
