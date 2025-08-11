// components/Transposer.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ALL_KEYS,
  preferSharpsForKey,
  stepsFromKeys,
  transposeChordText,
  transposeNote,
} from "@/lib/transpose";
import { encodeShareState, decodeShareState } from "@/lib/share";
import ChordDiagram from "@/components/ChordDiagram";
import { findVoicingsFor } from "@/lib/chords";
import Link from "next/link";
import MonospaceHotspots from "@/components/MonospaceHotspots";
import ShareRow from "@/components/ShareRow";
import PerformanceMode from "@/components/PerformanceMode";

type KeyName = (typeof ALL_KEYS)[number];

/** Token-level chord matcher for split(/(\s+)/) processing. */
const CHORD_REGEX =
  /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|\d|\/[A-G](?:#|b)?|[A-G]|#|b|\+|-|°|Δ)*$/;

const SAMPLE_INPUT = `C       G       Am      F
Take these chords and move them to a new key
C/E     F        G7      C
Supports slash chords and extensions too`;
const DEMO_BASE_KEY: KeyName = "C";

const MONO_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Tokenize for the diagrams grid (unique chords). */
function tokenize(text: string): Array<{ t: "chord" | "text"; v: string }> {
  return text
    .split(/(\s+)/)
    .filter(Boolean)
    .map((part) => ({
      t: CHORD_REGEX.test(part) ? "chord" : "text",
      v: part,
    }));
}

/* -------------------------- Popover + Card UI ---------------------------- */

function FloatingPopover({
  anchorRect,
  onClose,
  children,
}: {
  anchorRect: DOMRect;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // position near the hotspot with basic viewport clamping
  const margin = 8;
  const maxW = 320;
  const left = Math.max(8, Math.min(window.innerWidth - maxW - 8, anchorRect.left));
  const top = Math.min(window.innerHeight - 220, anchorRect.bottom + margin);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDocClick = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onDocClick, { capture: true });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onDocClick, true);
    };
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="false"
      className="fixed z-50 rounded-xl border border-border bg-card shadow-lg"
      style={{ left, top, maxWidth: maxW }}
    >
      {children}
    </div>
  );
}

function ChordPopoverCard({
  sym,
  capoFret = 0,
  onClose,
}: {
  sym: string;
  capoFret?: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const voicings = findVoicingsFor(sym);
  const has = voicings.length > 0;

  useEffect(() => setIdx(0), [sym]);

  return (
    <div className="p-2 w-80">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{sym}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-sm"
            onClick={() => has && setIdx((i) => (i - 1 + voicings.length) % voicings.length)}
            aria-label="Previous voicing"
          >
            ‹
          </button>
          <span className="text-xs tabular-nums">
            {has ? `${idx + 1}/${voicings.length}` : "0/0"}
          </span>
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-sm"
            onClick={() => has && setIdx((i) => (i + 1) % voicings.length)}
            aria-label="Next voicing"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-2">
        {has ? (
          <ChordDiagram shape={voicings[idx]} capoFret={capoFret} />
        ) : (
          <div className="rounded-lg border border-border p-2 text-xs text-muted">
            No diagram for this symbol.
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="text-xs text-muted underline decoration-dotted"
          onClick={onClose}
        >
          close
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- Main UI -------------------------------- */

export default function Transposer() {
  const [title, setTitle] = useState<string>("");
  const [input, setInput] = useState<string>(SAMPLE_INPUT);
  const [fromKey, setFromKey] = useState<KeyName>("C");
  const [toKey, setToKey] = useState<KeyName>("G");
  const [showCapo, setShowCapo] = useState<boolean>(false);
  const [capoFret, setCapoFret] = useState<number>(0);

  // Keep this for deep-links to /print with diagrams; no toggle in UI here.
  const [includeDiagrams] = useState<boolean>(false);

  // Popover state (we pass capoFret for the "capo shapes" view)
  const [pop, setPop] = useState<{
    open: boolean;
    sym: string | null;
    rect: DOMRect | null;
    capoForCard: number;
  }>({ open: false, sym: null, rect: null, capoForCard: 0 });

  const [stageOpen, setStageOpen] = useState(false);
  const [isDemo, setIsDemo] = useState<boolean>(true);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");

  const preferSharps = preferSharpsForKey(toKey);
  const steps = stepsFromKeys(fromKey, toKey);
  const debouncedInput = useDebounced(input, 150);

  const safeTranspose = useCallback(
    (text: string, semitones: number) => {
      const parts = text.split(/(\s+)/);
      return parts
        .map((part) =>
          CHORD_REGEX.test(part) ? transposeChordText(part, semitones, preferSharps) : part
        )
        .join("");
    },
    [preferSharps]
  );

  const renderDemoForKey = useCallback((k: KeyName) => {
    const prefer = preferSharpsForKey(k);
    const st = stepsFromKeys(DEMO_BASE_KEY, k);
    return SAMPLE_INPUT.split(/(\s+)/)
      .map((part) => (CHORD_REGEX.test(part) ? transposeChordText(part, st, prefer) : part))
      .join("");
  }, []);

  const sounding = useMemo(
    () => safeTranspose(debouncedInput, steps),
    [debouncedInput, steps, safeTranspose]
  );

  const shapesKey = useMemo(
    () => transposeNote(toKey, -capoFret, preferSharps),
    [toKey, capoFret, preferSharps]
  );

  const capoShapes = useMemo(
    () => (showCapo ? safeTranspose(sounding, -capoFret) : ""),
    [showCapo, sounding, capoFret, safeTranspose]
  );

  // Encoded state (used for Print / Save PDF and print page’s share row)
  const stateToken = useMemo(
    () =>
      encodeShareState({
        title,
        input,
        fromKey,
        toKey,
        capoFret,
        showCapo,
        includeDiagrams,
      }),
    [title, input, fromKey, toKey, capoFret, showCapo, includeDiagrams]
  );

  // Print link goes to /print?state=...&auto=1
  const printHref = useMemo(
    () => ({ pathname: "/print", query: { state: stateToken, auto: "1" } } as const),
    [stateToken]
  );

  // Deep-link /?state=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("state");
    if (!token) return;
    const decoded = decodeShareState(token);
    if (!decoded) return;
    setTitle(decoded.title ?? "");
    setInput(decoded.input ?? SAMPLE_INPUT);
    setFromKey(decoded.fromKey as KeyName);
    setToKey(decoded.toKey as KeyName);
    setCapoFret(decoded.capoFret ?? 0);
    setShowCapo(!!decoded.showCapo);
    setIsDemo(false);
  }, []);

  // Keep demo text in sync with From key until the user edits
  useEffect(() => {
    if (!isDemo) return;
    setInput(renderDemoForKey(fromKey));
  }, [fromKey, isDemo, renderDemoForKey]);

  const onSwap = useCallback(() => {
    setFromKey(toKey);
    setToKey(fromKey);
  }, [fromKey, toKey]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sounding);
      setCopyState("ok");
    } catch {
      setCopyState("err");
    } finally {
      setTimeout(() => setCopyState("idle"), 1600);
    }
  }, [sounding]);

  return (
    <section className="space-y-6">
      {/* Controls */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm text-muted">Song title (optional)</label>
            <input
              type="text"
              placeholder="eg. Wonderwall"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-card p-2"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted">From key</label>
            <select
              value={fromKey}
              onChange={(e) => setFromKey(e.target.value as KeyName)}
              className="w-full rounded-xl border border-border bg-card p-2"
            >
              {ALL_KEYS.map((k) => (
                <option key={`from-${k}`} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted">To key</label>
            <select
              value={toKey}
              onChange={(e) => setToKey(e.target.value as KeyName)}
              className="w-full rounded-xl border border-border bg-card p-2"
            >
              {ALL_KEYS.map((k) => (
                <option key={`to-${k}`} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={onSwap} className="rounded-lg border border-border px-3 py-2">
            Swap keys
          </button>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showCapo}
              onChange={(e) => setShowCapo(e.target.checked)}
            />
            Show capo shapes
          </label>

          {showCapo && (
            <div className="inline-flex items-center gap-2 text-sm">
              <span>Capo fret</span>
              <input
                type="range"
                min={0}
                max={9}
                value={capoFret}
                onChange={(e) => setCapoFret(parseInt(e.target.value, 10))}
              />
              <span className="font-medium">{capoFret}</span>
              <span className="text-muted">(play shapes in {shapesKey})</span>
            </div>
          )}
        </div>
      </div>

      {/* Two columns */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Input */}
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-sm font-medium text-foreground/80">Paste your chords</h2>
            {isDemo && (
              <span className="text-xs text-muted">(Demo updates with “From key” until you edit)</span>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (isDemo) setIsDemo(false);
            }}
            placeholder="Paste or type chords here…"
            className="h-[40vh] md:h-[260px] w-full max-w-full rounded-2xl border border-border bg-card p-3 font-mono text-[14px] leading-6 text-foreground shadow-sm tracking-normal [tab-size:4] [font-variant-ligatures:none]"
            spellCheck={false}
            style={{ fontFamily: MONO_STACK, letterSpacing: 0 }}
          />
        </div>

        {/* Output */}
        <div className="min-w-0">
          <div className="mb-2">
            <h2 className="min-w-0 flex-1 text-sm font-medium text-foreground/80">
              Your transposed chart (sounds in {toKey})
            </h2>
          </div>

          <div className="max-w-full overflow-x-auto">
            <MonospaceHotspots
              text={sounding}
              onChordClick={(sym, { rect }) =>
                setPop({ open: true, sym, rect, capoForCard: 0 })
              }
            />
          </div>

          {showCapo && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-medium text-foreground/80">
                Capo shapes to play (key of {shapesKey}, capo {capoFret})
              </h3>
              <div className="max-w-full overflow-x-auto">
                <MonospaceHotspots
                  text={capoShapes}
                  onChordClick={(sym, { rect }) =>
                    setPop({ open: true, sym, rect, capoForCard: capoFret })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global actions (below both columns) */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {/* Left: primary actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onCopy}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
              title="Copy the transposed text"
            >
              Copy
            </button>

            <button
              type="button"
              onClick={() => setStageOpen(true)}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
              title="Open big, high-contrast performance view"
            >
              Stage Mode
            </button>

            <Link
              href={printHref}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
              title="Open a clean print view and save to PDF"
            >
              Print / Save PDF
            </Link>

            {copyState === "ok" && <span className="text-xs text-muted">Copied!</span>}
            {copyState === "err" && <span className="text-xs text-muted">Copy failed</span>}
          </div>

          {/* Right: share cluster */}
          <div className="sm:ml-auto flex items-center gap-2 min-w-0">
            <span className="hidden md:inline text-xs text-muted whitespace-nowrap">Share</span>
            <ShareRow
              sharePath="/"
              title={title || `Transposed: ${fromKey} → ${toKey}`}
              message={`Burgo's Chord Transposer — easily transpose songs to different keys and check out different voicings`}
              showNative={false}
            />
          </div>
        </div>
      </div>

      {/* (Optional) Diagrams block — still supported via deep links */}
      {includeDiagrams && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Chord diagrams (first voicing)</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from(
              new Set(
                tokenize(sounding)
                  .filter((t) => t.t === "chord")
                  .map((t) => t.v)
              )
            ).map((sym) => {
              const v = findVoicingsFor(sym);
              if (!v[0]) return null;
              return (
                <div key={sym} className="rounded-xl border border-border p-2">
                  <div className="mb-1 text-xs font-medium">{sym}</div>
                  <ChordDiagram shape={v[0]} capoFret={0} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pop.open && pop.rect && pop.sym && (
        <FloatingPopover
          anchorRect={pop.rect}
          onClose={() => setPop({ open: false, sym: null, rect: null, capoForCard: 0 })}
        >
          <ChordPopoverCard
            sym={pop.sym}
            capoFret={pop.capoForCard}
            onClose={() => setPop({ open: false, sym: null, rect: null, capoForCard: 0 })}
          />
        </FloatingPopover>
      )}

      {/* Full-screen high-contrast performance view */}
      <PerformanceMode
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        title={title}
        soundingText={sounding}
        capoEnabled={showCapo}
        capoText={capoShapes}
        toKey={toKey}
        shapesKey={shapesKey}
        capoFret={capoFret}
      />
    </section>
  );
}
