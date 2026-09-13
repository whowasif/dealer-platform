"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "@/components/reveal";
import type { InsightItem } from "@/lib/site-content";

// A single insight card. Click toggles between the cover image and a text
// panel with the article excerpt (mirrors the Network card interaction).
function InsightCard({ post }: { post: InsightItem }) {
  const [open, setOpen] = useState(false);

  return (
    <article
      className="group cursor-pointer"
      onClick={() => setOpen((o) => !o)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((o) => !o);
        }
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div
              key="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col bg-ink p-5 text-white sm:p-6"
            >
              <span className="mb-1 block text-3xl font-black leading-none text-white/25">
                &rdquo;
              </span>
              {/* Scrollable so long excerpts are never clipped. */}
              <p className="min-h-0 flex-1 overflow-y-auto pr-1 text-sm leading-relaxed text-white/90">
                {post.excerpt}
              </p>
              <span className="mt-2 shrink-0 text-[11px] uppercase tracking-wide text-brand-400">
                Tap to close
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="img"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              <Image
                src={post.img}
                alt={post.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                Read more →
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <h3 className="mt-3 text-base font-medium leading-snug transition-colors group-hover:text-brand-500 sm:mt-4 sm:text-lg">
        {post.title}
      </h3>
      {post.date ? (
        <p className="mt-1.5 text-[11px] uppercase tracking-wide text-ink/50 sm:mt-2 sm:text-xs">
          {post.date}
        </p>
      ) : null}
    </article>
  );
}

export function Insights({ items }: { items: InsightItem[] }) {
  return (
    <section className="bg-cream pt-16 sm:pt-28">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow text-ink/50">Insights &amp; Opportunity</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="mt-4 text-2xl font-medium tracking-tight sm:text-4xl">
            Build the Future of Local Technology
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:mt-14 sm:grid-cols-3 sm:gap-8">
          {items.map((post, i) => (
            <Reveal key={`${post.title}-${i}`} delay={i}>
              <InsightCard post={post} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
