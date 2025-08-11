// components/ShareRow.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Props = {
  /** Pathlike URL to share (e.g. "/print?state=...") */
  sharePath: string;
  /** Optional window/document title fallback */
  title?: string;
  /** Optional message used for X/WhatsApp/Reddit/Email */
  message?: string;
  /** Show the native Web Share button in addition to icons (default: false) */
  showNative?: boolean;
  /** UTM campaign name (default: "chord_transposer") */
  utmCampaign?: string;
};

type Net = "x" | "facebook" | "whatsapp" | "reddit" | "email";

export default function ShareRow({
  sharePath,
  title,
  message,
  showNative = false,
  utmCampaign = "chord_transposer",
}: Props) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const baseUrl = useMemo(() => {
    if (!origin) return null;
    return new URL(sharePath, origin);
  }, [origin, sharePath]);

  const fallbackTitle =
    title || (typeof document !== "undefined" ? document.title : "Chord Chart");
  const shareMessage = message || fallbackTitle;

  const tracked = (source: Net) => {
    if (!baseUrl) return "";
    const u = new URL(baseUrl);
    u.searchParams.set("utm_source", source);
    u.searchParams.set("utm_medium", "share");
    u.searchParams.set("utm_campaign", utmCampaign);
    return u.toString();
  };

  const copy = async () => {
    if (!baseUrl) return;
    const u = new URL(baseUrl);
    u.searchParams.set("utm_source", "copy");
    u.searchParams.set("utm_medium", "share");
    u.searchParams.set("utm_campaign", utmCampaign);
    try {
      await navigator.clipboard.writeText(u.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      try {
        prompt("Copy this link:", u.toString());
      } catch {}
    }
  };

  const nativeShare = async () => {
    try {
      if ("share" in navigator) {
        await (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share?.({
          title: shareMessage,
          url: tracked("x"),
        });
      }
    } catch {
      /* user cancelled */
    }
  };

  const open = (href: string) =>
    window.open(href, "_blank", "noopener,noreferrer");

  if (!baseUrl) return null;

  // Encoded params
  const enc = (s: string) => encodeURIComponent(s);
  const msg = enc(shareMessage);

  const urlX = enc(tracked("x"));
  const urlFb = enc(tracked("facebook"));
  const urlWaFull = enc(`${shareMessage} ${tracked("whatsapp")}`);
  const urlRd = enc(tracked("reddit"));
  const urlEmail = tracked("email"); // not encoded; mailto builds its own query

  return (
    <div className="flex items-center gap-2">
      {showNative && "share" in navigator && (
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-2 text-sm"
          onClick={nativeShare}
        >
          Share
        </button>
      )}

      <button
        type="button"
        className="rounded-lg border border-border px-3 py-2 text-sm"
        onClick={copy}
      >
        Copy link
      </button>
      {copied && <span className="text-xs text-muted">Copied!</span>}

      <IconBtn
        label="Share to X"
        title="X"
        onClick={() =>
          open(`https://twitter.com/intent/tweet?text=${msg}&url=${urlX}`)
        }
      >
        <IconX />
      </IconBtn>

      <IconBtn
        label="Share to Facebook"
        title="Facebook"
        onClick={() =>
          open(`https://www.facebook.com/sharer/sharer.php?u=${urlFb}`)
        }
      >
        <IconFacebook />
      </IconBtn>

      <IconBtn
        label="Share to WhatsApp"
        title="WhatsApp"
        onClick={() => open(`https://wa.me/?text=${urlWaFull}`)}
      >
        <IconWhatsApp />
      </IconBtn>

      <IconBtn
        label="Share to Reddit"
        title="Reddit"
        onClick={() =>
          open(`https://www.reddit.com/submit?url=${urlRd}&title=${msg}`)
        }
      >
        <IconReddit />
      </IconBtn>

      <IconBtn
        label="Share via email"
        title="Email"
        onClick={() =>
          open(`mailto:?subject=${msg}&body=${encodeURIComponent(`${shareMessage}\n\n${urlEmail}`)}`)
        }
      >
        <IconMail />
      </IconBtn>
    </div>
  );
}

/* ---------- Small UI helpers ---------- */
function IconBtn({
  children,
  label,
  title,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title || label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-background"
    >
      {children}
    </button>
  );
}

/* ---------- Inline SVG icons (monochrome, theme-aware via currentColor) ---------- */
function IconX() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M3 3l7.5 9.2L3.6 21H6l6-7.4L17.4 21H21l-7.6-9.3L21 3h-2.4l-5.5 6.8L7.8 3H3z" />
    </svg>
  );
}
function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.3c0-.9.2-1.5 1.5-1.5H16V4.2c-.3 0-1.2-.1-2.1-.1-2.1 0-3.6 1.3-3.6 3.7v2.1H8v3h2.3V21h3.2z" />
    </svg>
  );
}
function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M20.5 3.5A10 10 0 006.1 19.3L3 21l1.7-3a10 10 0 0015.8-14.5zM12 5a7 7 0 015.2 11.6A7 7 0 016.7 6.3 7 7 0 0112 5zm3.5 10.1c-.3.3-1.6.6-2.9.1-1.3-.4-2.7-1.4-3.7-2.6-1-1.2-1.7-2.6-1.8-3.5 0-.9.8-1.4 1.1-1.5.3-.1.6-.1.7 0l.6 1.4c.1.2.1.3 0 .4l-.5.6c-.1.1-.1.3 0 .5.4.8 1.8 2.3 2.8 2.7.2.1.3 0 .5-.1l.8-.5c.1-.1.3-.1.4 0l1.4.7c.1.1.2.3.1.5z" />
    </svg>
  );
}
function IconReddit() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M21 12.3c0-.9-.7-1.6-1.6-1.6-.5 0-1 .2-1.3.6-1.2-.8-2.8-1.3-4.6-1.4l.8-3.7 2.6.6c0 .7.6 1.2 1.3 1.2.7 0 1.3-.6 1.3-1.3S19.2 5 18.5 5c-.5 0-1 .3-1.2.7l-3.1-.7c-.2 0-.4.1-.4.3l-.9 4.1c-1.8 0-3.4.5-4.6 1.3-.3-.3-.8-.5-1.3-.5-.9 0-1.6.7-1.6 1.6 0 .6.3 1.1.8 1.4-.1.4-.1.7-.1 1 0 2.5 2.9 4.4 6.5 4.4s6.5-1.9 6.5-4.4c0-.3 0-.7-.1-1 .5-.3.8-.9.8-1.4zm-10.8 1.6a1.3 1.3 0 110-2.7 1.3 1.3 0 010 2.7zm6.4 0a1.3 1.3 0 110-2.7 1.3 1.3 0 010 2.7zm-3.2 3.5c-1.2 0-2.2-.3-3-.8-.2-.1-.2-.4 0-.5.2-.2.4-.2.6 0 .6.4 1.5.7 2.4.7s1.8-.3 2.4-.7c.2-.1.4-.1.6 0 .2.1.2.4 0 .5-.8.5-1.8.8-3 .8z" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M3 6h18a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1zm1.8 2l6.9 4.6c.2.1.4.1.6 0L19.2 8H4.8z" />
    </svg>
  );
}
