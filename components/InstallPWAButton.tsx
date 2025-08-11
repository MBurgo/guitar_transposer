// components/InstallPWAButton.tsx
"use client";

import React, { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPWAButton({ compact = false }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setInstalled] = useState(false);
  const [iosTip, setIosTip] = useState(false);

  useEffect(() => {
    // Detect if already standalone (Android/desktop + iOS Safari)
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      nav.standalone === true;
    if (standalone) setInstalled(true);

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !standalone) setIosTip(true);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setIosTip(false);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (isInstalled) return null;

  // iOS tip (no BIP)
  if (iosTip && !deferred) {
    return (
      <button
        type="button"
        className={
          compact
            ? "text-xs underline decoration-dotted"
            : "rounded-lg border border-border px-3 py-2 text-sm"
        }
        onClick={() =>
          alert('On iPhone/iPad: Tap the Share icon, then “Add to Home Screen”.')
        }
        title="Add to Home Screen"
      >
        Install app
      </button>
    );
  }

  // BIP available
  if (!deferred) return null;

  return (
    <button
      type="button"
      className={
        compact
          ? "text-xs underline decoration-dotted"
          : "rounded-lg border border-border px-3 py-2 text-sm"
      }
      onClick={async () => {
        try {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null); // hide after user decides
        } catch {
          /* user dismissed or unsupported */
        }
      }}
      title="Install app"
    >
      Install app
    </button>
  );
}
