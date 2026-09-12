import Image from "next/image";
import { CONTACT, NAV } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer
      className="relative flex min-h-[100svh] flex-col overflow-hidden text-ink"
      style={{
        backgroundImage: "url('/footer-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Main content fills the flexible space so the wordmark sits at the bottom */}
      <div className="container-page relative z-10 flex flex-1 flex-col justify-center py-10 sm:py-16">
        <div className="grid gap-6 sm:gap-10 lg:grid-cols-3 lg:gap-14">
          {/* Brand blurb + contact */}
          <div>
            <p className="text-base font-medium sm:text-lg">
              Connect. Grow. Lead.{" "}
              <span className="text-ink/50"></span>
            </p>
            {/* Blurb hidden on phones to keep the footer within one screen */}
            <p className="mt-4 hidden max-w-sm text-sm leading-relaxed text-ink/70 sm:block">
              MIS Solution brings trusted technology to every upazila —
              digital services, business hardware, and dependable maintenance
              and support, all under one national brand across Bangladesh.
            </p>
            <div className="mt-4 space-y-1.5 text-sm text-ink/70 sm:mt-6 sm:space-y-2">
              <p>{CONTACT.address}</p>
              <p>
                {CONTACT.emails.map((e, i) => (
                  <span key={e}>
                    <a
                      href={`mailto:${e}`}
                      className="transition-colors hover:text-brand-500"
                    >
                      {e}
                    </a>
                    {i < CONTACT.emails.length - 1 && " | "}
                  </span>
                ))}
              </p>
              <p>
                <a
                  href={`tel:${CONTACT.hotlineTel}`}
                  className="transition-colors hover:text-brand-500"
                >
                  {CONTACT.hotline}
                </a>
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="lg:justify-self-center">
            <ul className="space-y-3">
              {NAV.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-ink/80 transition-colors hover:text-brand-500"
                  >
                    {item.label}
                    <span className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* CTA */}
          <div className="lg:justify-self-end">
            <p className="max-w-xs text-base font-medium sm:text-lg">
              Looking for trusted technology in your area?
            </p>
            {/* Detail hidden on phones to keep the footer within one screen */}
            <p className="mt-3 hidden max-w-xs text-sm text-ink/70 sm:block">
              Tell us what you need — a product, a project, or ongoing support —
              and our team will help you find the right solution anywhere in
              Bangladesh.
            </p>
            <a href="#contact" className="btn-fill mt-4 bg-ink text-white sm:mt-6">
              Contact us
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-ink/15 pt-4 text-xs uppercase tracking-wide text-ink/60 sm:mt-10 sm:flex-row sm:justify-between sm:pt-6">
          <span>MIS Solution 2026 ©</span>
          <span>Nationwide ICT Network</span>
        </div>
      </div>

      {/* Logo on the left, smaller "MIS SOLUTION" wordmark beside it — pinned to bottom */}
      <div className="relative z-10 flex-none select-none px-2 pb-4">
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-8">
          {/* Logo on the left */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] uppercase tracking-[0.3em] text-ink/50">
              Powered By
            </span>
            <Image
              src="/footer-logo.png"
              alt="MIS Solution"
              width={200}
              height={200}
              className="h-12 w-auto sm:h-16"
            />
          </div>
          <div className="wordmark text-center text-[10vw] leading-none text-ink sm:text-[8vw]">
            MIS SOLUTION
          </div>
        </div>
      </div>
    </footer>
  );
}
