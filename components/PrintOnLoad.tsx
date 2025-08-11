// components/PrintOnLoad.tsx
"use client";

import { useEffect } from "react";

export default function PrintOnLoad({ enable = false }: { enable?: boolean }) {
  useEffect(() => {
    if (!enable) return;
    // small delay so fonts/layout settle before opening the dialog
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {
        // no-op
      }
    }, 120);
    return () => clearTimeout(t);
  }, [enable]);

  return null;
}
