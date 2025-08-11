"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Props = {
  /** Full, preformatted chart text (already transposed). Tabs will be normalized to spaces. */
  text: string;
  /** Called when a chord hotspot is clicked. */
  onChordClick?: (chord: string, info: { line: number; col: number; rect: DOMRect }) => void;
  /** Extra classes for the outer container. */
  className?: string;
  /** Optional aria-label for the chart <pre>. */
  ariaLabel?: string;
  /** Disable hotspots (e.g., while user is selecting text elsewhere). */
  disabled?: boolean;
};

type Hotspot = {
  id: string;
  chord: string;
  line: number; // 0-based
  col: number;  // 0-based char index in line
  len: number;  // token length in chars
};

/** Chord matcher for scanning inside each line: roots, accidentals, common extensions, slash chords. */
const CHORD_INLINE_RE =
  /\b([A-G](?:#|b)?(?:(?:maj7|maj9|maj|min7|min9|min|m7b5|m7|m9|m|sus2|sus4|add9|add11|dim7|dim|aug|7|9|11|13|6|5|4|2|b5|#5|b9|#9|b13|#11)*)?(?:\/[A-G](?:#|b)?)?)\b/g;

const TAB_SPACES = 4;

function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/\t/g, " ".repeat(TAB_SPACES));
}

function detectHotspots(text: string): Hotspot[] {
  const out: Hotspot[] = [];
  const lines = text.split("\n");
  for (let li = 0; li < lines.length; li++) {
    const L = lines[li];
    CHORD_INLINE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CHORD_INLINE_RE.exec(L))) {
      const chord = m[1];
      const col = m.index;
      out.push({ id: `${li}:${col}`, chord, line: li, col, len: chord.length });
    }
  }
  return out;
}

function measureLineHeightFallback(pre: HTMLPreElement): number {
  const test = document.createElement("span");
  test.textContent = "A";
  test.style.visibility = "hidden";
  pre.appendChild(test);
  const h = test.getBoundingClientRect().height || 24;
  pre.removeChild(test);
  return h;
}

export default function MonospaceHotspots({
  text,
  onChordClick,
  className,
  ariaLabel = "Chord chart",
  disabled,
}: Props) {
  const normalized = useMemo(() => normalizeText(text), [text]);
  const tokens = useMemo(() => detectHotspots(normalized), [normalized]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);

  const [metrics, setMetrics] = useState<{
    charWidth: number;
    lineHeight: number;
    padTop: number;
    padLeft: number;
  } | null>(null);

  // Friendly text selection: if the user drags to select text, temporarily disable hotspots.
  const [selectMode, setSelectMode] = useState(false);
  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    let isDown = false;

    const onDown = () => { isDown = true; };
    const onMove = () => { if (isDown) setSelectMode(true); };
    const onUp = () => { isDown = false; setTimeout(() => setSelectMode(false), 0); };

    host.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      host.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useLayoutEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const compute = () => {
      const cs = window.getComputedStyle(pre);
      const lineHeight = parseFloat(cs.lineHeight) || measureLineHeightFallback(pre);
      const padTop = parseFloat(cs.paddingTop) || 0;
      const padLeft = parseFloat(cs.paddingLeft) || 0;

      // Measure char width using a hidden measuring span in the same font context.
      const meas = document.createElement("span");
      meas.textContent = "0000000000"; // 10 chars for stability
      meas.style.visibility = "hidden";
      meas.style.position = "absolute";
      meas.style.whiteSpace = "pre";
      pre.appendChild(meas);
      const charWidth = meas.getBoundingClientRect().width / 10;
      pre.removeChild(meas);

      setMetrics({ charWidth, lineHeight, padTop, padLeft });
    };

    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(pre);

    // Recompute after web fonts load
    if (document.fonts && "ready" in document.fonts) {
      document.fonts.ready.then(() => compute());
    }

    return () => {
      ro.disconnect();
    };
  }, [normalized]);

  return (
    <div
      ref={containerRef}
      className={["relative overflow-auto rounded-2xl border border-border bg-card shadow-sm", className].filter(Boolean).join(" ")}
    >
      {/* The real text — keeping it pristine preserves perfect alignment */}
      <pre
        ref={preRef}
        aria-label={ariaLabel}
        className="m-0 whitespace-pre font-mono text-[14px] leading-6 p-3 text-foreground tracking-normal
                   [font-variant-ligatures:none] [tab-size:4] selection:bg-indigo-200/90 selection:text-black"
      >
{normalized}
      </pre>

      {/* Hotspot layer (invisible; disabled while selecting; hidden in print) */}
      <div className="absolute inset-0 pointer-events-none print:hidden" style={{ zIndex: 1 }}>
        {metrics && !disabled && !selectMode &&
          tokens.map((t) => {
            const top = metrics.padTop + t.line * metrics.lineHeight;
            const left = metrics.padLeft + t.col * metrics.charWidth;
            const width = t.len * metrics.charWidth;
            const height = metrics.lineHeight;

            return (
              <button
                key={t.id}
                type="button"
                data-chord={t.chord}
                aria-label={`Chord ${t.chord}`}
                className="absolute pointer-events-auto bg-transparent border-0 p-0 rounded-sm
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70
                           hover:outline hover:outline-1 hover:outline-slate-400/35"
                style={{ top, left, width, height }}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  if (!onChordClick) return;
                  onChordClick(t.chord, {
                    line: t.line,
                    col: t.col,
                    rect: e.currentTarget.getBoundingClientRect(),
                  });
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
                title={t.chord}
              />
            );
          })}
      </div>
    </div>
  );
}
