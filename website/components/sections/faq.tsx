"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "@/components/reveal";
import { FAQ } from "@/lib/content";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-cream py-16 sm:py-28">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow text-ink/50">Frequently Asked</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="mt-4 max-w-4xl text-2xl font-medium tracking-tight sm:text-4xl">
            Everything you want to know about MIS Solution
          </h2>
        </Reveal>

        <div className="mt-10 border-t border-ink/15 sm:mt-14">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-ink/15">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left sm:gap-6 sm:py-6"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium sm:text-lg">
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="shrink-0 text-xl font-light text-ink/60 sm:text-2xl"
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-3xl pb-5 text-[13px] leading-relaxed text-ink/70 sm:pb-6 sm:text-base">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
