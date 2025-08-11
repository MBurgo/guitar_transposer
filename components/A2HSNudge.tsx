"use client";

import React, { useEffect, useState } from "react";

type ChoiceOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: ChoiceOutcome; platform: string }>;
}

function isStandalone(): boolean {
  const mql = window.matchMedia("(display-mode: standalone)");
  const nav = navigator as Navigator & { standalone?: boolean };
  return mql.matches || !!nav.standalone;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

const DISMISS_KEY = "a2hs-dismissed-v1";

export default function A2HSNudge() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent;
      e.preventDefault();
      setDeferred(evt);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    // iOS Safari never fires beforeinstallprompt
    if (isIOS()) setTimeout(() => setIosHint(true), 500);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show && !iosHint) return null;

  return (
    <div className="print:hidden">
      <div className="rounded-xl border border-border bg-card/80 px-3 py-2 text-sm shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            {deferred ? (
              <span>Install this app for offline, full‑screen use.</span>
            ) : (
              <span>Tip: Add this app to your Home Screen for full‑screen use.</span>
            )}
          </div>

          {deferred ? (
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-1"
              onClick={async () => {
                await deferred.prompt();
                setShow(false);
                setDeferred(null);
                localStorage.setItem(DISMISS_KEY, "1");
              }}
            >
              Install
            </button>
          ) : (
            isIOS() && (
              <span className="text-xs text-muted">
                In Safari: Share → “Add to Home Screen”
              </span>
            )
          )}

          <button
            type="button"
            aria-label="Dismiss"
            className="rounded border border-border px-2 py-1 text-xs"
            onClick={() => {
              setShow(false);
              setIosHint(false);
              localStorage.setItem(DISMISS_KEY, "1");
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
