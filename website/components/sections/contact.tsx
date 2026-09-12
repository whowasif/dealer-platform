"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "@/components/reveal";
import { CONTACT } from "@/lib/content";

type Status = "idle" | "submitting" | "success" | "error";

// Public contact section — anyone (a home user, shop, office, or institution)
// can reach out for a product, a project, or ongoing support. Not recruitment.
export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      fullName: String(data.get("fullName") || "").trim(),
      businessName: String(data.get("businessName") || "").trim(),
      email: String(data.get("email") || "").trim(),
      mobile: String(data.get("mobile") || "").trim(),
      details: String(data.get("details") || "").trim(),
    };

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong. Please try again.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Please try again.");
    }
  }

  const fieldClass =
    "w-full border-b border-ink/25 bg-transparent py-3 text-base outline-none transition-colors placeholder:text-ink/40 focus:border-ink";
  const labelClass = "eyebrow mb-1 block text-ink/50";

  return (
    <section id="contact" className="bg-cream pb-16 sm:pb-28">
      <div className="container-page grid gap-10 sm:gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left intro */}
        <div>
          <Reveal>
            <p className="eyebrow text-ink/50">Contact</p>
          </Reveal>
          <Reveal delay={1}>
            <h2 className="mt-4 text-2xl font-medium leading-tight tracking-tight sm:text-4xl">
              Let&apos;s talk technology
            </h2>
          </Reveal>
          <Reveal delay={2}>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/70 sm:mt-6 sm:text-base">
              Whether you need a product, a full project, or ongoing support,
              tell us what you&apos;re looking for and our team will help you
              find the right solution — anywhere in Bangladesh.
            </p>
          </Reveal>
          <Reveal delay={3}>
            <div className="mt-8 space-y-3 text-sm text-ink/70">
              <p>
                <span className="eyebrow block text-ink/40">Call</span>
                <a
                  href={`tel:${CONTACT.hotlineTel}`}
                  className="text-base text-ink transition-colors hover:text-brand-500"
                >
                  {CONTACT.hotline}
                </a>
              </p>
              <p>
                <span className="eyebrow block text-ink/40">Email</span>
                {CONTACT.emails.map((em, i) => (
                  <span key={em}>
                    <a
                      href={`mailto:${em}`}
                      className="text-base text-ink transition-colors hover:text-brand-500"
                    >
                      {em}
                    </a>
                    {i < CONTACT.emails.length - 1 && (
                      <span className="text-ink/40"> · </span>
                    )}
                  </span>
                ))}
              </p>
              <p>
                <span className="eyebrow block text-ink/40">Visit</span>
                <span className="text-base text-ink">{CONTACT.address}</span>
              </p>
            </div>
          </Reveal>
        </div>

        {/* Right form */}
        <Reveal delay={1}>
          <div className="relative">
            <form onSubmit={onSubmit} className="grid gap-8 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="fullName">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  required
                  className={fieldClass}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="businessName">
                  Organisation (optional)
                </label>
                <input
                  id="businessName"
                  name="businessName"
                  className={fieldClass}
                  placeholder="Your home, shop, office or institution"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={fieldClass}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="mobile">
                  Mobile Number
                </label>
                <input
                  id="mobile"
                  name="mobile"
                  required
                  className={fieldClass}
                  placeholder="+880 1XXXXXXXXX"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="details">
                  How can we help?
                </label>
                <textarea
                  id="details"
                  name="details"
                  rows={3}
                  className={`${fieldClass} resize-none`}
                  placeholder="Tell us about the product, project, or support you need — and your district / upazila."
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="btn-fill disabled:opacity-60"
                >
                  {status === "submitting" ? "Sending…" : "Send message"}
                </button>
                {status === "error" && (
                  <p className="mt-3 text-sm text-red-600">{error}</p>
                )}
              </div>
            </form>

            {/* Success overlay */}
            <AnimatePresence>
              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-cream text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl">
                    ✓
                  </div>
                  <h3 className="mt-5 text-2xl font-medium">Message received</h3>
                  <p className="mt-2 max-w-sm text-ink/70">
                    Thank you for reaching out. Our team will review your message
                    and get back to you soon.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-6 text-sm font-semibold underline underline-offset-4"
                  >
                    Send another
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
