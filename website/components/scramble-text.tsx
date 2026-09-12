"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*";

// Scramble-text effect: when the element scrolls into view, each character
// cycles through random glyphs and then "locks in" to the final letter, left to
// right. Before it starts (and after it scrolls away) the text is blank, so the
// scramble is always the first thing you see. It REPLAYS every time the element
// re-enters the viewport (once:false), and an optional `startDelay` staggers
// cards one after another.
export function ScrambleText({
  text,
  className,
  startDelay = 0,
  speed = 28,
  revealPerTick = 1,
}: {
  text: string;
  className?: string;
  startDelay?: number;
  speed?: number;
  revealPerTick?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.2 });
  // Start empty so the final text is never shown before scrambling.
  const [display, setDisplay] = useState("");

  useEffect(() => {
    // Reset to blank when it leaves the viewport so the next entry animates fresh.
    if (!inView) {
      setDisplay("");
      return;
    }

    let tickTimer: ReturnType<typeof setTimeout>;
    let startTimer: ReturnType<typeof setTimeout>;
    let revealed = 0;

    const step = () => {
      const out = text
        .split("")
        .map((ch, i) => {
          if (ch === " ") return " ";
          if (i < revealed) return ch;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
        .join("");
      setDisplay(out);

      revealed += revealPerTick;
      if (revealed <= text.length) {
        tickTimer = setTimeout(step, speed);
      } else {
        setDisplay(text);
      }
    };

    startTimer = setTimeout(step, startDelay);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(tickTimer);
    };
  }, [inView, text, startDelay, speed, revealPerTick]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden>{display}</span>
    </span>
  );
}
