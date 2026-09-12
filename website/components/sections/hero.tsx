"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { IMG } from "@/lib/content";

// Headline copy for the two-part typewriter sequence.
const INTRO = "WebITOne"; // typed first, then erased
const LINE_ONE = "We Beat As One";
const LINE_TWO = "Initiative For a Brighter Bangladesh";

// Timing (ms). One "beep" = one caret blink ≈ 1000ms (matches .caret-blink).
const TYPE_MS = 110; // per character while typing (slower, smoother)
const ERASE_MS = 45; // per character while backspacing
const BEEP = 1000; // one cursor blink
const HOLD_AFTER_INTRO = 3 * BEEP; // 3 beeps after "WebITOne"
const HOLD_AFTER_FULL = 9 * BEEP; // 8–10 beeps before looping

type Phase =
  | "typingIntro"
  | "holdIntro"
  | "erasingIntro"
  | "typingLineOne"
  | "typingLineTwo"
  | "holdFull";

// Continuous, phased typewriter:
//   1. type "WebITOne"  -> hold 3 beeps
//   2. backspace all of it
//   3. type "We Beat As One" (line 1)
//   4. type "Initiative For a Brighter Bangladesh" (line 2)
//   5. hold ~9 beeps, then repeat from step 1.
function TypewriterHeadline() {
  const [phase, setPhase] = useState<Phase>("typingIntro");
  const [n, setN] = useState(0); // characters typed in the current field

  // Advance to the next phase and reset the character counter atomically, so a
  // freshly-typed line can never start with leftover characters from the last.
  const goto = (next: Phase) => {
    setPhase(next);
    setN(0);
  };

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;

    switch (phase) {
      case "typingIntro":
        if (n < INTRO.length) t = setTimeout(() => setN(n + 1), TYPE_MS);
        else t = setTimeout(() => setPhase("holdIntro"), 0);
        break;
      case "holdIntro":
        // n holds INTRO.length here; keep it for the erase phase.
        t = setTimeout(() => setPhase("erasingIntro"), HOLD_AFTER_INTRO);
        break;
      case "erasingIntro":
        if (n > 0) t = setTimeout(() => setN(n - 1), ERASE_MS);
        else t = setTimeout(() => goto("typingLineOne"), 200);
        break;
      case "typingLineOne":
        if (n < LINE_ONE.length) t = setTimeout(() => setN(n + 1), TYPE_MS);
        else t = setTimeout(() => goto("typingLineTwo"), 450);
        break;
      case "typingLineTwo":
        if (n < LINE_TWO.length) t = setTimeout(() => setN(n + 1), TYPE_MS);
        else t = setTimeout(() => setPhase("holdFull"), 0);
        break;
      case "holdFull":
        t = setTimeout(() => goto("typingIntro"), HOLD_AFTER_FULL);
        break;
    }

    return () => clearTimeout(t);
  }, [phase, n]);

  // Derive what to show on each line for the current phase.
  const introVisible =
    phase === "typingIntro" ||
    phase === "holdIntro" ||
    phase === "erasingIntro";

  let lineOne = "";
  let lineTwo = "";
  let caretOn: "one" | "two" = "one";

  if (introVisible) {
    lineOne = INTRO.slice(0, n);
    caretOn = "one";
  } else if (phase === "typingLineOne") {
    lineOne = LINE_ONE.slice(0, n);
    caretOn = "one";
  } else {
    // typingLineTwo or holdFull
    lineOne = LINE_ONE;
    lineTwo = phase === "holdFull" ? LINE_TWO : LINE_TWO.slice(0, n);
    caretOn = "two";
  }

  return (
    <div aria-label={`${LINE_ONE} ${LINE_TWO}`}>
      {/* Line one (left aligned) */}
      <span className="block whitespace-nowrap text-left">
        {lineOne}
        {caretOn === "one" && (
          <span className="caret-blink ml-0.5 inline-block">|</span>
        )}
      </span>
      {/* Line two (right aligned) */}
      <span className="block whitespace-nowrap text-right">
        {lineTwo}
        {caretOn === "two" && (
          <span className="caret-blink ml-0.5 inline-block">|</span>
        )}
      </span>
    </div>
  );
}

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
    // Measure after paint so the element's position is already applied,
    // avoiding the "container has a non-static position" warning.
    layoutEffect: false,
  });

  const wordScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const wordY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const captionOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    // The whole hero fits in exactly one screen: a flex column of height 100vh.
    // The wordmark panel sits on top; the image band fills the remaining space,
    // so the full image AND the tagline are always visible within the viewport.
    <section
      id="home"
      ref={ref}
      style={{ position: "relative" }}
      className="flex h-[100svh] min-h-[560px] flex-col overflow-hidden"
    >
      {/* Top cream panel with the typewriter headline (half the old wordmark size) */}
      <div className="flex flex-none items-center bg-cream pt-20 pb-6 sm:pt-24">
        <motion.div
          style={{
            scale: wordScale,
            y: wordY,
            // Size so the longest line ("Initiative For a Brighter
            // Bangladesh") always fits on a single row, mobile to desktop.
            fontSize: "clamp(0.82rem, 3.6vw, 3rem)",
          }}
          className="wordmark container-page origin-left leading-[1.1] text-black/15"
        >
          <TypewriterHeadline />
        </motion.div>
      </div>

      {/* Dhaka aerial image band — fills the rest of the screen */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <motion.div style={{ y: imgY }} className="absolute inset-0 -top-[10%] h-[120%]">
          {/* Taller crop for narrow/mobile screens so the image isn't cut off sideways */}
          <Image
            src={IMG.heroCityTall}
            alt="Aerial view of Dhaka, Bangladesh"
            fill
            priority
            sizes="(min-width: 640px) 0px, 100vw"
            className="object-cover sm:hidden"
          />
          {/* Wider crop for tablets and desktops */}
          <Image
            src={IMG.heroCity}
            alt="Aerial view of Dhaka, Bangladesh"
            fill
            priority
            sizes="(min-width: 640px) 100vw, 0px"
            className="hidden object-cover sm:block"
          />
        </motion.div>

        <motion.div
          style={{ opacity: captionOpacity }}
          className="container-page absolute inset-x-0 bottom-0 pb-8 text-ink"
        >
          <p className="eyebrow text-ink/60">Dhanmondi, Dhaka, Bangladesh</p>
          <p className="mt-2 max-w-xl text-xl font-medium leading-tight sm:text-3xl">
            Powering every upazila with trusted technology opportunity.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
