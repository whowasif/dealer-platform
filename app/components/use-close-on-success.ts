"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// -----------------------------------------------------------------------------
// useCloseOnSuccess — auto-close a form once a server action reports success.
//
// Pass the `success` flag from your useFormState result. When it flips truthy,
// this either navigates to `redirectTo` (default behavior for full-page forms)
// or calls `onClose` (for modal forms). A short delay lets the success banner
// flash before we leave, which reads as a confirmation rather than a jump.
// -----------------------------------------------------------------------------

export function useCloseOnSuccess(
  success: string | boolean | undefined,
  options: { redirectTo?: string; onClose?: () => void; delayMs?: number } = {}
) {
  const router = useRouter();
  const { redirectTo, onClose, delayMs = 700 } = options;
  const handled = useRef(false);

  useEffect(() => {
    if (!success || handled.current) return;
    handled.current = true;

    const t = setTimeout(() => {
      if (onClose) {
        onClose();
      } else if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      }
    }, delayMs);

    return () => clearTimeout(t);
  }, [success, redirectTo, onClose, delayMs, router]);
}
