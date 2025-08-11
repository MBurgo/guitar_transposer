// components/ChordDiagram.tsx
import React from "react";
import type { Shape } from "@/lib/chords";

type Props = {
  shape: Shape;
  capoFret?: number; // label only; shape remains same fingering
  title?: string;
  className?: string;
};

export default function ChordDiagram({ shape, capoFret = 0, title, className }: Props) {
  const width = 200;
  const height = 220;
  const margin = { top: 30, right: 18, bottom: 24, left: 18 };
  const gridW = width - margin.left - margin.right;
  const gridH = height - margin.top - margin.bottom;

  const strings = 6;
  const frets = 5;
  const dx = gridW / (strings - 1);
  const dy = gridH / frets;

  const { positions, baseFret, barres } = shape;

  const cx = Array.from({ length: strings }, (_, s) => margin.left + s * dx);
  const cy = (fret: number) => margin.top + fret * dy - dy / 2;

  return (
    <svg width={width} height={height} className={className} aria-label={`Chord diagram ${title ?? shape.name}`}>
      {/* Title */}
      <text x={width / 2} y={18} textAnchor="middle" fontSize={14} fill="currentColor">
        {title ?? shape.name}
      </text>

      {/* Base fret label */}
      {baseFret > 1 && (
        <text x={width - 6} y={28} textAnchor="end" fontSize={12} fill="currentColor" opacity={0.85}>
          fret {baseFret}
        </text>
      )}

      {/* Capo note */}
      {capoFret > 0 && (
        <text x={width / 2} y={height - 6} textAnchor="middle" fontSize={12} fill="currentColor" opacity={0.85}>
          Capo {capoFret}
        </text>
      )}

      <g fill="none" stroke="currentColor">
        {/* Frets */}
        {Array.from({ length: frets + 1 }).map((_, i) => (
          <line
            key={`fret-${i}`}
            x1={margin.left}
            y1={margin.top + i * dy}
            x2={width - margin.right}
            y2={margin.top + i * dy}
            strokeWidth={i === 0 && baseFret === 1 ? 4 : 1.25}
            opacity={i === 0 ? 0.95 : 0.55}
          />
        ))}

        {/* Strings */}
        {Array.from({ length: strings }).map((_, s) => (
          <line
            key={`str-${s}`}
            x1={cx[s]}
            y1={margin.top}
            x2={cx[s]}
            y2={height - margin.bottom}
            strokeWidth={s === 0 || s === 5 ? 1.6 : 1.1}
            opacity={0.62}
          />
        ))}

        {/* Barres */}
        {barres?.map((b, idx) => {
          const x1 = cx[b.fromString];
          const x2 = cx[b.toString];
          const y = cy(b.fret);
          const pad = 8;
          return (
            <rect
              key={`barre-${idx}`}
              x={Math.min(x1, x2) - pad}
              y={y - pad}
              width={Math.abs(x2 - x1) + pad * 2}
              height={16}
              rx={8}
              fill="currentColor"
              opacity={0.9}
            />
          );
        })}

        {/* Dots / open / mute */}
        {positions.map((p, s) => {
          const x = cx[s];
          if (p === -1) {
            return (
              <text key={`mute-${s}`} x={x} y={margin.top - 8} textAnchor="middle" fontSize={14} fill="currentColor">
                ×
              </text>
            );
          }
          if (p === 0 && baseFret === 1) {
            return (
              <circle
                key={`open-${s}`}
                cx={x}
                cy={margin.top - 10}
                r={6.5}
                stroke="currentColor"
                strokeWidth={2}
                fill="none"
              />
            );
          }
          if (p > 0) {
            const y = cy(p);
            return <circle key={`dot-${s}`} cx={x} cy={y} r={9} fill="currentColor" opacity={0.92} />;
          }
          return null;
        })}
      </g>
    </svg>
  );
}
