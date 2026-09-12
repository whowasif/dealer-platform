"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Reveal } from "@/components/reveal";
import { COMPARISON } from "@/lib/content";

// A traditional-way line: the text gets a "cut line" (strike-through) drawn
// across it, left to right, whenever it scrolls into view. The strike is a
// second copy of the text with a real CSS line-through (so it sits correctly on
// EVERY wrapped line); a growing width overlay reveals it left-to-right. Using
// an explicit useInView + animate makes the trigger reliable on every device.
function StrikeItem({ text, delay }: { text: string; delay: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const boxRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.6 });
  const [boxWidth, setBoxWidth] = useState(0);

  // Measure the base text box so the struck overlay wraps identically and the
  // line-through lands on every wrapped line while the reveal width animates.
  useEffect(() => {
    const measure = () => {
      if (boxRef.current) setBoxWidth(boxRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text]);

  return (
    <li
      ref={ref}
      className="flex items-start gap-3 text-[13px] leading-relaxed text-white/50 sm:text-sm"
    >
      <span aria-hidden className="mt-0.5 shrink-0 text-white/25">
        ✕
      </span>
      <span ref={boxRef} className="relative inline-block align-top">
        {/* Base (un-struck) text sets the size and wrapping. */}
        <span>{text}</span>
        {/* Struck copy on top, revealed by growing its overflow width. The inner
            text is locked to the measured box width so it never re-wraps. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden text-white/80 [text-decoration:line-through] [text-decoration-color:#f9d616] [text-decoration-thickness:2px]"
          initial={{ width: 0 }}
          animate={inView ? { width: boxWidth } : { width: 0 }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            className="block whitespace-normal"
            style={{ width: boxWidth || "auto" }}
          >
            {text}
          </span>
        </motion.span>
      </span>
    </li>
  );
}

// A MIS-way line: an animated tick that draws itself and pops in, then the text.
function CheckItem({ text, delay }: { text: string; delay: number }) {
  return (
    <li className="flex items-start gap-3 text-[13px] leading-relaxed text-white sm:text-sm">
      <motion.span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20"
        initial={{ scale: 0, rotate: -30 }}
        whileInView={{ scale: 1, rotate: 0 }}
        viewport={{ once: false, amount: 0.6 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <motion.path
            d="M4 12.5l5 5L20 6"
            className="text-brand"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: false, amount: 0.6 }}
            transition={{ duration: 0.8, delay: delay + 0.18, ease: "easeInOut" }}
          />
        </svg>
      </motion.span>
      <span>{text}</span>
    </li>
  );
}

// "Why MIS" — the mission statement plus a clear traditional-vs-MIS comparison
// that makes the project's core advantage obvious to the public.
export function JoinNetwork() {
  const STEP = 0.22; // stagger between rows

  return (
    <section
      id="why-mis"
      className="overflow-hidden bg-ink py-16 text-white sm:py-28"
    >
      <div className="container-page">
        <Reveal>
          <p className="eyebrow text-white/50">Why MIS Solution</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="mt-4 max-w-4xl text-2xl font-medium leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
            A fairer, faster way to bring technology to every corner of
            Bangladesh
          </h2>
        </Reveal>
        <Reveal delay={2}>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            For too long, genuine products, fair pricing, and dependable support
            stopped at the big cities. Our mission is to change that — one
            trusted local partner, one national standard, reaching every
            upazila.
          </p>
        </Reveal>

        {/* Traditional vs MIS comparison */}
        <div className="mt-12 grid gap-5 sm:mt-16 sm:gap-6 lg:grid-cols-2">
          {/* Traditional way */}
          <Reveal delay={1}>
            <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-9">
              <h3 className="text-base font-semibold text-white/60 sm:text-lg">
                {COMPARISON.traditionalTitle}
              </h3>
              <ul className="mt-5 space-y-4">
                {COMPARISON.rows.map((row, i) => (
                  <StrikeItem
                    key={row.traditional}
                    text={row.traditional}
                    delay={i * STEP}
                  />
                ))}
              </ul>
            </div>
          </Reveal>

          {/* MIS way */}
          <Reveal delay={2}>
            <div className="h-full rounded-2xl border border-brand/40 bg-brand/10 p-6 sm:p-9">
              <h3 className="text-base font-semibold text-brand sm:text-lg">
                {COMPARISON.misTitle}
              </h3>
              <ul className="mt-5 space-y-4">
                {COMPARISON.rows.map((row, i) => (
                  <CheckItem key={row.mis} text={row.mis} delay={i * STEP} />
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
