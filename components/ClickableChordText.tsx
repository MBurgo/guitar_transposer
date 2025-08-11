// components/ClickableChordText.tsx
"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import ChordDiagram from "@/components/ChordDiagram";
import { findVoicingsFor, Shape } from "@/lib/chords";

type Props = {
  text: string;
  capoFret?: number;
  className?: string;
  title?: string;
};

type Pop = {
  chordSymbol: string;
  voicings: Shape[];
  index: number;
  rect: DOMRect;
};

export default function ClickableChordText({ text, capoFret = 0, className, title }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);

  const tokens = useMemo(() => text.split(/(\s+)/), [text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPop(null);
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (pop && !containerRef.current.contains(e.target as Node)) setPop(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [pop]);

  const openPopover = (e: React.MouseEvent<HTMLButtonElement>, tok: string) => {
    const voicings = findVoicingsFor(tok);
    const rect = e.currentTarget.getBoundingClientRect();
    setPop({ chordSymbol: tok, voicings, index: 0, rect });
  };

  const nextVoicing = () => {
    if (!pop) return;
    const len = Math.max(1, pop.voicings.length);
    const next = (pop.index + 1) % len;
    setPop({ ...pop, index: next });
  };

  const prevVoicing = () => {
    if (!pop) return;
    const len = Math.max(1, pop.voicings.length);
    const prev = (pop.index - 1 + len) % len;
    setPop({ ...pop, index: prev });
  };

  const popStyle: React.CSSProperties | undefined = useMemo(() => {
    if (!pop || !containerRef.current) return undefined;
    const cRect = containerRef.current.getBoundingClientRect();
    const left = Math.max(0, pop.rect.left - cRect.left - 10);
    const top = pop.rect.bottom - cRect.top + 8;
    return { left, top };
  }, [pop]);

  const currentVoicing = pop?.voicings?.[pop.index];
  const multi = (pop?.voicings?.length ?? 0) > 1;

  return (
    <div className={className}>
      {title && <div className="mb-2 text-sm font-medium text-foreground/80">{title}</div>}

      <div ref={containerRef} className="relative rounded-2xl border border-border bg-card p-3 shadow-sm">
        <pre className="whitespace-pre-wrap break-words font-mono text-[13px] text-foreground">
          {tokens.map((tok, i) => {
            if (/^\s+$/.test(tok) || tok === "") return <span key={i}>{tok}</span>;
            if (/^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|\d|\/|[A-G]|#|b|\+|\-|°|Δ)*$/i.test(tok)) {
              return (
                <button
                  key={i}
                  onClick={(e) => openPopover(e, tok)}
                  className="inline rounded px-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-foreground/60"
                  title="Show chord diagrams"
                >
                  {tok}
                </button>
              );
            }
            return <span key={i}>{tok}</span>;
          })}
        </pre>

        {/* Popover */}
        {pop && (
          <div
            className="absolute z-20 w-[240px] rounded-xl border border-border bg-card p-2 shadow-xl"
            style={popStyle}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">{pop.chordSymbol}</div>
              <div className="flex items-center gap-1">
                {multi && (
                  <>
                    <button onClick={prevVoicing} className="rounded-md border border-border px-2 text-xs hover:bg-white/10" aria-label="Previous voicing">‹</button>
                    <button onClick={nextVoicing} className="rounded-md border border-border px-2 text-xs hover:bg-white/10" aria-label="Next voicing">›</button>
                  </>
                )}
                <button onClick={() => setPop(null)} className="rounded-md border border-border px-2 text-xs hover:bg-white/10" aria-label="Close">✕</button>
              </div>
            </div>

            {currentVoicing ? (
              <>
                <ChordDiagram
                  shape={currentVoicing}
                  capoFret={capoFret}
                  title={currentVoicing.name}
                  className="mt-1 text-foreground"
                />
                <div className="mt-1 text-[11px] text-muted">
                  {capoFret > 0 ? <>Capo at fret {capoFret}. </> : null}
                  Base fret: {currentVoicing.baseFret}
                  {multi && (
                    <> • Voicing {pop.index + 1} / {pop.voicings.length}</>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-2 text-xs text-muted">
                No diagram yet. Try a nearby open chord or a standard barre shape.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
