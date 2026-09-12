"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "@/components/reveal";
import { TESTIMONIALS } from "@/lib/content";

// One full-width quote at a time, advanced with the prev/next controls.
export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const total = TESTIMONIALS.length;

  const paginate = (d: number) => {
    setDir(d);
    setIndex((i) => (i + d + total) % total);
  };

  const active = TESTIMONIALS[index];

  return (
    <section className="bg-cream py-16 sm:py-28">
      <div className="container-page">
        <div className="flex items-end justify-between">
          <Reveal>
            <p className="eyebrow text-ink/50">Voices From The Community</p>
          </Reveal>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink/60">
              {index + 1} / {total}
            </span>
            <button
              onClick={() => paginate(-1)}
              aria-label="Previous testimonial"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 transition-colors hover:bg-ink hover:text-white"
            >
              ←
            </button>
            <button
              onClick={() => paginate(1)}
              aria-label="Next testimonial"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white transition-transform hover:scale-105"
            >
              →
            </button>
          </div>
        </div>

        <div className="relative mt-10 overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.blockquote
              key={index}
              custom={dir}
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -60 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`relative flex min-h-[240px] w-full flex-col justify-between rounded-2xl p-6 text-ink sm:min-h-[340px] sm:p-14 ${
                active.color === "brand"
                  ? "bg-brand"
                  : active.color === "mint"
                  ? "bg-mint"
                  : "bg-sky"
              }`}
            >
              <span className="self-end text-5xl font-black leading-none opacity-80 sm:text-7xl">
                &rdquo;
              </span>
              <div>
                <p className="max-w-4xl text-lg font-medium leading-snug sm:text-3xl lg:text-4xl">
                  {active.quote}
                </p>
                <footer className="mt-6 text-xs font-semibold opacity-70 sm:mt-8 sm:text-sm">
                  — {active.author}
                </footer>
              </div>
            </motion.blockquote>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
