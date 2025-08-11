// app/print/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { decodeShareState } from "@/lib/share";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

type Decoded = Record<string, unknown>;

function pickString(o: Decoded, key: string): string | undefined {
  const v = o[key];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

function pickNumber(o: Decoded, key: string): number | undefined {
  const v = o[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export default async function OGImage({
  searchParams,
}: {
  searchParams: { state?: string };
}) {
  const state = searchParams?.state || "";

  // Safely coerce the decoded payload
  const raw = decodeShareState(state) as unknown;
  const d: Decoded = raw && typeof raw === "object" ? (raw as Decoded) : {};

  const titleFromState = pickString(d, "title");
  const fromKey = pickString(d, "fromKey");
  const toKey = pickString(d, "toKey");
  const capoFret = pickNumber(d, "capoFret");

  const title =
    titleFromState ||
    (fromKey && toKey ? `Transposed: ${fromKey} → ${toKey}` : "Chord Transposer");

  const sub =
    fromKey && toKey
      ? `From ${fromKey} to ${toKey}${capoFret ? ` · Capo ${capoFret}` : ""}`
      : "Paste chords · Pick keys · Print";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "linear-gradient(135deg, rgba(72,92,199,0.95), rgba(0,149,200,0.95))",
          color: "white",
          padding: 64,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -0.5,
              textShadow: "0 4px 12px rgba(0,0,0,.25)",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 28, opacity: 0.95, textShadow: "0 2px 8px rgba(0,0,0,.2)" }}>
            {sub}
          </div>
          <div style={{ marginTop: "auto", fontSize: 22, opacity: 0.9 }}>
            guitar-chord-transposer.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
