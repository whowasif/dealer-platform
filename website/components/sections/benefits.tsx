"use client";

import { Reveal } from "@/components/reveal";
import { ScrambleText } from "@/components/scramble-text";
import { BENEFITS } from "@/lib/content";

// Client-facing benefits grid — the concrete reasons homes, shops, offices and
// institutions across Bangladesh choose MIS Solution. Each card's text resolves
// with a scramble-text effect, one card after another, when the grid enters the
// viewport (single loop — it does not repeat while on screen).
export function Benefits() {
  // Stagger between cards (ms). Title scrambles first, body a touch after.
  const CARD_GAP = 420;

  return (
    <section id="benefits" className="bg-cream py-16 sm:py-28">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow text-ink/50">What You Get</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="mt-4 max-w-3xl text-2xl font-medium leading-tight tracking-tight sm:text-4xl">
            Built around what clients actually need
          </h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:mt-14 lg:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <div
              key={b.title}
              className="h-full bg-cream p-4 transition-colors hover:bg-white sm:p-8"
            >
              <div className="text-xs font-semibold text-brand-500 sm:text-sm">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-2 text-sm font-semibold leading-snug sm:mt-4 sm:text-xl">
                <ScrambleText text={b.title} startDelay={i * CARD_GAP} />
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-ink/70 sm:mt-3 sm:text-sm">
                <ScrambleText
                  text={b.body}
                  startDelay={i * CARD_GAP + 160}
                  speed={12}
                  revealPerTick={2}
                />
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
