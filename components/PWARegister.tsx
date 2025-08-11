"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) {
      console.warn("[PWA] Service workers not supported.");
      return;
    }
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.info("[PWA] Registered:", reg.scope);
      } catch (e) {
        console.error("[PWA] Registration failed:", e);
      }
    };
    // Ensure it runs after Next hydrates
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
