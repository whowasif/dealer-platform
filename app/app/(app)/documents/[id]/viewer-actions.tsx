"use client";

// -----------------------------------------------------------------------------
// Viewer actions for a document: open in a standard viewer (new tab) and print.
// Printing works by opening the file URL in a new window and invoking the
// browser's print dialog once it loads — this covers both PDFs and images with
// the OS/browser's native viewer.
// -----------------------------------------------------------------------------

export function DocViewerActions({
  fileUrl,
  kind,
}: {
  fileUrl: string;
  kind: "image" | "pdf" | "other";
}) {
  function print() {
    const w = window.open(fileUrl, "_blank");
    if (!w) return;
    // Wait for the resource to render, then trigger print.
    const trigger = () => {
      try {
        w.focus();
        w.print();
      } catch {
        /* pop-up blocked or cross-origin timing — user can print manually */
      }
    };
    w.addEventListener("load", trigger);
    // Fallback in case 'load' doesn't fire for embedded viewers.
    setTimeout(trigger, 1200);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        {kind === "image" ? "Open in image viewer" : "Open in viewer"} ↗
      </a>
      <button
        type="button"
        onClick={print}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M6 9V2h12v7" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v8H6z" />
        </svg>
        Print
      </button>
    </div>
  );
}
