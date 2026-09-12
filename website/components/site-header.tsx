"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { NAV } from "@/lib/content";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when the menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
          scrolled && !open ? "bg-cream/80 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="container-page grid grid-cols-[1fr_auto_1fr] items-center py-5">
          {/* MIS SOLUTION wordmark on the left (restored) */}
          <a
            href="#home"
            className="justify-self-start text-sm font-semibold uppercase tracking-[0.25em] text-ink mix-blend-difference"
          >
            MIS Solution
          </a>
          {/* Centered logo */}
          <a href="#home" className="justify-self-center" aria-label="MIS Solution home">
            <Image
              src="/mis-logo.png"
              alt="MIS Solution"
              width={160}
              height={44}
              priority
              className="h-9 w-auto sm:h-10"
            />
          </a>
          <button
            onClick={() => setOpen(true)}
            className="justify-self-end rounded-full bg-ink px-6 py-2 text-sm font-medium text-white transition-transform hover:scale-105"
            aria-label="Open menu"
          >
            Menu
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-ink text-white"
            initial={{ clipPath: "circle(0% at 100% 0%)" }}
            animate={{ clipPath: "circle(150% at 100% 0%)" }}
            exit={{ clipPath: "circle(0% at 100% 0%)" }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="container-page flex items-center justify-end py-6">
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-white/80 transition-colors hover:text-white"
              >
                Close
              </button>
            </div>
            <nav className="container-page mt-10 flex flex-col gap-2 sm:mt-16">
              {NAV.map((item, i) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="wordmark group w-fit text-5xl uppercase text-white/60 transition-colors hover:text-white sm:text-7xl"
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.5 }}
                >
                  {item.label}
                </motion.a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
