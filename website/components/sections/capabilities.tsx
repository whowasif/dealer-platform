"use client";

import { motion, type Variants } from "framer-motion";
import { Reveal } from "@/components/reveal";
import { CAPABILITIES } from "@/lib/content";

// Each division row slides in from an alternating side, one after another:
// row 1 from the left, row 2 from the right, row 3 from the left again.
const rowVariants: Variants = {
  hidden: (fromLeft: boolean) => ({
    opacity: 0,
    x: fromLeft ? -90 : 90,
  }),
  visible: () => ({
    opacity: 1,
    x: 0,
    transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function Capabilities() {
  return (
    <section id="services" className="bg-ink pb-16 pt-16 text-white sm:pb-28 sm:pt-28">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow text-white/50">Our Capabilities</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="mt-4 max-w-4xl text-2xl font-medium leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Three divisions. One trusted technology partner.
          </h2>
        </Reveal>

        {/* Parent staggers children so the rows appear one by one. */}
        <motion.div
          className="mt-10 border-t border-white/15 sm:mt-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          transition={{ staggerChildren: 0.45 }}
        >
          {CAPABILITIES.map((c, i) => {
            const fromLeft = i % 2 === 0; // left, right, left
            return (
              <motion.div
                key={c.no}
                custom={fromLeft}
                variants={rowVariants}
                className="group grid grid-cols-1 gap-2 border-b border-white/15 py-6 transition-colors hover:bg-white/[0.03] sm:grid-cols-[80px_1fr_1.2fr] sm:items-start sm:gap-8 sm:py-8 sm:px-2"
              >
                <div className="text-xs text-white/50 sm:text-sm">{c.no}</div>
                <h3 className="text-lg font-semibold text-brand transition-transform duration-300 group-hover:translate-x-1 sm:text-2xl">
                  {c.title}
                </h3>
                <div>
                  <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
                    {c.body}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-1.5 sm:mt-5 sm:gap-2">
                    {c.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-medium text-white/80 transition-colors group-hover:border-brand/50 group-hover:text-white sm:px-3 sm:text-xs"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
