"use client";

import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { STATS } from "@/lib/content";

export function About() {
  return (
    <section id="about" className="bg-cream py-16 sm:py-28">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow text-ink/50">About MIS Solution</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="mt-4 max-w-5xl text-2xl font-medium leading-[1.2] tracking-tight sm:mt-6 sm:text-4xl lg:text-5xl">
            Building the technology network that brings trusted ICT solutions,
            business opportunity, and digital progress to every corner of
            Bangladesh.
          </h2>
        </Reveal>
        <Reveal delay={2}>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink/70 sm:mt-10 sm:text-base">
            MIS Solution is a nationwide ICT company built to put trusted
            technology within reach of every community. Through three full
            service divisions, central stock with fast delivery, uniform fair
            pricing, and dependable local support, we make reliable digital
            solutions accessible in every upazila — not just the big cities.
          </p>
        </Reveal>

        {/* Stats band */}
        <div className="mt-12 grid grid-cols-3 gap-4 sm:mt-16 sm:gap-6">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i + 1}>
              <div className="flex flex-col items-center text-center">
                <div className="wordmark text-3xl text-ink sm:text-6xl">
                  <CountUp value={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-2 text-[10px] font-medium uppercase tracking-wide text-brand-500 sm:mt-3 sm:text-sm">
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
