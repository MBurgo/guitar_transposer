// components/PerformanceMode.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Title shown at top-left (song name if provided, else a default) */
  title?: string;
  /** Transposed text that actually sounds in target key */
  soundingText: string;
  /** If capo is enabled, these are the shapes to play */
  capoEnabled?: boolean;
  capoText?: string;
  /** Display helpers */
  toKey: string;
  shapesKey?: string;
  capoFret?: number;
};

// Same chord symbol heuristic you use in the app
const CHORD_REGEX =
  /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|\d|\/[A-G](?:#|b)?|[A-G]|#|b|\+|-|°|Δ)*$/;

// Is a given line mostly chord tokens?
function looksLikeChordLine(line: string): boolean {
  const parts = line.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  let tokens = 0;
  let chords = 0;
  for (const raw of parts) {
    const t = raw.replace(/[|()[\],.:;'"!?*_~\-]/g, "");
    if (!t) continue;
    tokens++;
    if (CHORD_REGEX.test(t)) chords++;
  }
  if (tokens === 0) return false;
  // Heuristic: at least half the tokens (or at least 1) are chords
  return chords >= Math.max(1, Math.floor(tokens * 0.5));
}

// Wake Lock typing helpers (avoid `any`)
type WakeLockSentinel = { release: () => Promise<void> };
type WakeLockAPI = { request: (type: "screen") => Promise<WakeLockSentinel> };

export default function PerformanceMode({
  open,
  onClose,
  title,
  soundingText,
  capoEnabled = false,
  capoText = "",
  toKey,
  shapesKey = "",
  capoFret = 0,
}: Props) {
  const [view, setView] = useState<"sounding" | "capo">(capoEnabled ? "capo" : "sounding");
  const [fontScale, setFontScale] = useState<number>(1.45); // ~1.45rem baseline
  const [secsPerLine, setSecsPerLine] = useState<number>(4);
  const [running, setRunning] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number | null>(null);
  const linePxRef = useRef<number>(0);
  const activeIdxRef = useRef<number>(0);
  const [activeIdx, setActiveIdx] = useState<number>(0);

  // Keep screen awake while Stage Mode is open
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    let cancelled = false;

    async function acquire() {
      try {
        const wl = (navigator as Navigator & { wakeLock?: WakeLockAPI }).wakeLock;
        const sentinel = await wl?.request?.("screen");
        if (!cancelled && sentinel) wakeRef.current = sentinel;
      } catch {
        // Safari/iOS may not support; ignore
      }
    }
    async function release() {
      try {
        await wakeRef.current?.release();
      } catch {
        // ignore
      } finally {
        wakeRef.current = null;
      }
    }

    if (open) {
      acquire();
      // Re-acquire after returning from background
      const onVisibility = () => {
        if (document.visibilityState === "visible") acquire();
      };
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        cancelled = true;
        document.removeEventListener("visibilitychange", onVisibility);
        release();
      };
    }
  }, [open]);

  // Which text block are we showing?
  const activeText = view === "capo" && capoEnabled ? capoText || soundingText : soundingText;

  // Lines + chord/lyric classification
  const lines = useMemo(() => activeText.split("\n"), [activeText]);
  const isChordLine = useMemo(() => lines.map(looksLikeChordLine), [lines]);

  // Given a current line index, compute the couplet [start, end] to highlight
  const coupletFor = useCallback(
    (i: number): [number, number] => {
      const n = lines.length;
      if (n === 0) return [0, 0];
      i = Math.max(0, Math.min(n - 1, i));

      if (isChordLine[i]) {
        // Pair chord line with the next non-empty line (usually lyrics)
        let j = i + 1;
        while (j < n && lines[j].trim() === "") j++;
        return [i, Math.min(j, n - 1)];
      }

      // If current is lyric and previous was chords, pair with previous
      if (i > 0 && isChordLine[i - 1]) {
        return [i - 1, i];
      }

      // Fallback: stable 2-line buckets [0–1], [2–3], ...
      const start = Math.floor(i / 2) * 2;
      return [start, Math.min(start + 1, n - 1)];
    },
    [lines, isChordLine]
  );

  // Measure the pixel line height after render
  const measureLine = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = el.querySelector('[data-line="0"]') as HTMLElement | null;
    if (first) {
      const h = first.getBoundingClientRect().height;
      if (h > 0) linePxRef.current = h;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      measureLine();
      if (scrollRef.current && linePxRef.current > 0) {
        const i = Math.round(scrollRef.current.scrollTop / linePxRef.current);
        activeIdxRef.current = i;
        setActiveIdx(i);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [open, fontScale, lines.length, view, measureLine]);

  // Autoscroll metrics
  const computeMetrics = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return { dist: 0, dur: 0, pps: 0 };
    const dist = Math.max(0, el.scrollHeight - el.clientHeight);
    const dur = Math.max(0.1, lines.length * secsPerLine);
    const pps = dist / dur;
    return { dist, dur, pps };
  }, [lines.length, secsPerLine]);

  // Keep active line updated when user scrolls by hand
  const recalcActiveFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || linePxRef.current <= 0) return;
    const i = Math.max(
      0,
      Math.min(lines.length - 1, Math.round(el.scrollTop / linePxRef.current))
    );
    if (i !== activeIdxRef.current) {
      activeIdxRef.current = i;
      setActiveIdx(i);
    }
  }, [lines.length]);

  // Animation step
  const step = useCallback(
    (t: number) => {
      const el = scrollRef.current;
      if (!el) return;
      if (startTsRef.current === null) startTsRef.current = t;

      const { dist, dur, pps } = computeMetrics();
      if (dist <= 1 || dur <= 0.1) {
        setRunning(false);
        startTsRef.current = null;
        return;
      }

      const elapsed = (t - (startTsRef.current ?? t)) / 1000; // sec
      const y = Math.min(dist, elapsed * pps);
      el.scrollTop = y;

      // Update active line even for programmatic scroll
      if (linePxRef.current > 0) {
        const i = Math.max(
          0,
          Math.min(lines.length - 1, Math.round(y / linePxRef.current))
        );
        if (i !== activeIdxRef.current) {
          activeIdxRef.current = i;
          setActiveIdx(i);
        }
      }

      if (y >= dist) {
        setRunning(false);
        startTsRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    },
    [computeMetrics, lines.length]
  );

  // Start/stop loop
  useEffect(() => {
    if (!open) return;
    if (running) {
      rafRef.current = requestAnimationFrame(step);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      };
    }
  }, [open, running, fontScale, secsPerLine, lines.length, view, step]);

  const toggleRun = useCallback(() => setRunning((r) => !r), []);
  const stop = useCallback(() => {
    setRunning(false);
    startTsRef.current = null;
  }, []);
  const resetToTop = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    startTsRef.current = null;
    activeIdxRef.current = 0;
    setActiveIdx(0);
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        stop();
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        toggleRun();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollRef.current && (scrollRef.current.scrollTop -= linePxRef.current || 48);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollRef.current && (scrollRef.current.scrollTop += linePxRef.current || 48);
      } else if (e.key === "+") {
        e.preventDefault();
        setFontScale((s) => Math.min(2.2, s + 0.05));
      } else if (e.key === "-") {
        e.preventDefault();
        setFontScale((s) => Math.max(1.0, s - 0.05));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, toggleRun, stop]);

  if (!open) return null;

  const [pairStart, pairEnd] = coupletFor(activeIdx);

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/15">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm opacity-80">{title?.trim() || "Stage Mode"}</div>
          <div className="truncate text-xs opacity-60">
            {view === "capo" && capoEnabled
              ? `Capo ${capoFret} • play shapes in ${shapesKey}`
              : `Sounds in ${toKey}`}
          </div>
        </div>

        {/* View toggle (only if capo is available) */}
        {capoEnabled && (
          <div className="flex items-center gap-2">
            <label className="text-xs opacity-80">View</label>
            <select
              className="rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-sm"
              value={view}
              onChange={(e) => {
                stop();
                resetToTop();
                setView(e.target.value as "sounding" | "capo");
              }}
            >
              <option value="sounding">Transposed</option>
              <option value="capo">Capo shapes</option>
            </select>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-2">
          <label className="text-xs opacity-80">Font</label>
          <input
            aria-label="Font size"
            type="range"
            min={1}
            max={2.2}
            step={0.05}
            value={fontScale}
            onChange={(e) => setFontScale(parseFloat(e.target.value))}
          />
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <label className="text-xs opacity-80">Sec/line</label>
          <input
            aria-label="Seconds per line"
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={secsPerLine}
            onChange={(e) => setSecsPerLine(parseFloat(e.target.value))}
          />
          <span className="text-xs opacity-80 w-8 text-right tabular-nums">
            {secsPerLine.toFixed(1)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            onClick={() => {
              if (!running) resetToTop();
              setRunning((r) => !r);
            }}
            title="Spacebar to start/pause"
          >
            {running ? "Pause" : "Start"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            onClick={() => {
              stop();
              resetToTop();
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            onClick={() => {
              stop();
              onClose();
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Scroll body */}
      <div
        ref={scrollRef}
        className="h-[calc(100vh-56px)] overflow-y-auto px-4 py-6"
        onScroll={recalcActiveFromScroll}
        style={{
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: `${fontScale}rem`,
          lineHeight: 1.6,
          letterSpacing: 0,
          whiteSpace: "pre",
        }}
      >
        {lines.map((ln, i) => {
          const inPair = i >= pairStart && i <= pairEnd;
          return (
            <div
              key={i}
              data-line={i}
              className={
                inPair
                  ? "bg-white/20 ring-1 ring-white/30 rounded -mx-2 px-2"
                  : undefined
              }
            >
              {ln.length ? ln : "\u00A0"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
