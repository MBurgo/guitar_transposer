// components/PdfImport.tsx
"use client";

import React, { useCallback, useRef, useState } from "react";

type Props = { onText: (text: string) => void; className?: string };

// Minimal structural types (no `any`)
type PdfDocumentLike = { numPages: number; getPage: (n: number) => Promise<PdfPageLike> };
type PdfPageLike = {
  getTextContent: (opts?: Record<string, unknown>) => Promise<{ items: unknown[] }>;
};
type PdfJsApi = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (opts: { data: Uint8Array }) => { promise: Promise<PdfDocumentLike> };
};
type TextItemLike = {
  str: string;
  width: number;
  transform: [number, number, number, number, number, number]; // e = x, f = y
  hasEOL?: boolean;
};

function isTextItemLike(x: unknown): x is TextItemLike {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.str === "string" &&
    typeof r.width === "number" &&
    Array.isArray(r.transform) &&
    r.transform.length === 6
  );
}

// Same matcher you use elsewhere for chords
const CHORD_RE =
  /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|\d|\/[A-G](?:#|b)?|[A-G]|#|b|\+|-|°|Δ)*$/i;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_PAGES = 8;
const LOCAL_WORKER = "/pdf.worker.min.mjs";
const CDN_WORKER =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

export default function PdfImport({ onText, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onChoose = useCallback(() => inputRef.current?.click(), []);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setErr(null);
      try {
        if (file.size > MAX_BYTES) {
          setErr("That PDF is a bit large. Try a file under 8 MB.");
          return;
        }
        const buf = await file.arrayBuffer();
        const { text } = await extractTextFromPdf(buf, MAX_PAGES);
        if (!text || text.trim().length < 10) {
          setErr(
            "Couldn’t find selectable text. If this is a scanned PDF, we’ll need OCR (coming soon)."
          );
        } else {
          onText(text);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error while parsing the PDF.";
        if (/worker/i.test(msg)) {
          setErr("PDF worker not found. Run `npm install` to copy it, then refresh.");
        } else {
          setErr(`Sorry — failed to read that PDF. ${msg}`);
        }
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        setBusy(false);
      }
    },
    [onText]
  );

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(evt) => {
          const f = evt.target.files?.[0];
          if (f) void handleFile(f);
          evt.currentTarget.value = ""; // allow re-selecting same file
        }}
      />

      <button
        type="button"
        onClick={onChoose}
        disabled={busy}
        className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-background disabled:opacity-60"
        title="Import a PDF chord chart (text-based works best)"
      >
        {busy ? "Reading PDF…" : "Import PDF (beta)"}
      </button>

      <p className="mt-1 text-xs text-muted">
        Works best with text‑based PDFs. Scanned images will need OCR (planned).
      </p>

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}

/* ------------------------- PDF extraction helpers ------------------------ */

async function extractTextFromPdf(
  buf: ArrayBuffer,
  maxPages: number
): Promise<{ text: string }> {
  const pdfjs = (await import("pdfjs-dist")) as unknown as PdfJsApi;

  // Prefer local worker; fall back to CDN so dev keeps moving
  try {
    if (await head(LOCAL_WORKER)) {
      pdfjs.GlobalWorkerOptions.workerSrc = LOCAL_WORKER;
    } else if (await head(CDN_WORKER)) {
      pdfjs.GlobalWorkerOptions.workerSrc = CDN_WORKER;
    }
  } catch {
    // ignore — pdf.js may still try inline; we handle errors above
  }

  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

  const out: string[] = [];
  const pages = Math.min(doc.numPages, Math.max(1, maxPages));

  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);

    // Ask pdf.js to give us combined text runs & normalized whitespace.
    const content = await page.getTextContent({
      normalizeWhitespace: true,
      disableCombineTextItems: false,
    } as Record<string, unknown>);

    // Convert raw items into positioned runs
    type Run = { str: string; x: number; y: number; w: number; eol: boolean };
    const runs: Run[] = [];
    for (const raw of content.items) {
      if (!isTextItemLike(raw)) continue;
      const [, , , , e, f] = raw.transform; // e=x, f=y
      runs.push({
        str: raw.str,
        x: e,
        y: f,
        w: raw.width || 0,
        eol: !!raw.hasEOL,
      });
    }
    if (runs.length === 0) continue;

    // Group into physical lines by y (descending)
    runs.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: Run[][] = [];
    const yThreshold = 3;

    for (const r of runs) {
      const last = lines[lines.length - 1];
      if (!last) lines.push([r]);
      else {
        const dy = Math.abs(r.y - last[0].y);
        if (dy <= yThreshold) last.push(r);
        else lines.push([r]);
      }
    }

    for (const lineRuns of lines) {
      lineRuns.sort((a, b) => a.x - b.x);

      // Decide if this looks like a chord line
      const probe = lineRuns.map((r) => r.str).join(" ");
      const chordish = looksLikeChords(probe);

      const line = chordish
        ? rebuildChordLine(lineRuns)
        : rebuildLyricLine(lineRuns);

      const tightened = chordish ? line : tightenSpacedCaps(line);

      if (tightened.trim().length) out.push(rtrim(tightened));
    }

    if (p < pages) out.push(""); // page break
  }

  return { text: out.join("\n") };
}

/* ------------------------------ Rebuilders ------------------------------- */

function rebuildLyricLine(runs: { str: string; x: number; w: number }[]): string {
  // Join runs by measuring the actual gap between runs.
  const advSamples = runs
    .map((r) => r.w / Math.max(1, r.str.replace(/\s+/g, "").length))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  const adv = advSamples.length ? advSamples[Math.floor(advSamples.length / 2)] : 6;

  let out = "";
  let prevRight = runs[0]?.x ?? 0;

  for (const r of runs) {
    const clean = r.str.replace(/\s+/g, " ").trim();
    if (!clean) continue;

    const gap = r.x - prevRight;
    if (out) {
      // Small gaps (letter‑spacing) → no space, otherwise 1–2 spaces
      if (gap > adv * 0.6 && gap <= adv * 1.8) out += " ";
      else if (gap > adv * 1.8) out += "  ";
    }
    out += clean;
    prevRight = r.x + r.w;
  }
  return out;
}

function rebuildChordLine(runs: { str: string; x: number; w: number }[]): string {
  // Place tokens into a coarse grid using a character unit.
  const tokens = runs
    .map((r) => ({ ...r, str: r.str.replace(/\s+/g, " ").trim() }))
    .filter((r) => r.str.length);

  const left = tokens[0]?.x ?? 0;
  const charSamples = tokens
    .map((t) => t.w / Math.max(1, t.str.length))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  const unit = Math.max(4, charSamples.length ? charSamples[Math.floor(charSamples.length / 2)] : 7);

  const grid: string[] = [];
  for (const t of tokens) {
    const col = Math.max(0, Math.round((t.x - left) / unit));
    // grow grid
    if (grid.length < col) grid.length = col;
    // place token
    const before = grid.join("");
    const pad = col - before.length;
    if (pad > 0) grid.push(" ".repeat(pad));
    grid.push(t.str);
  }
  return grid.join("");
}

function looksLikeChords(line: string): boolean {
  const parts = line.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  const hits = parts.filter((p) => CHORD_RE.test(p)).length;
  return hits / parts.length >= 0.55;
}

function tightenSpacedCaps(line: string): string {
  // Collapse "S O N G  S T R U C T U R E" → "SONG STRUCTURE" for non‑chord lines
  const lettersOnly = line.replace(/\s+/g, "");
  const isCaps = /^[A-Z'()]+$/.test(lettersOnly);
  const spaceRatio = (line.match(/ /g)?.length ?? 0) / Math.max(1, line.length);
  if (isCaps && spaceRatio > 0.25 && line.length >= 10) {
    return line.replace(/ (?=[A-Z'()])/g, "");
  }
  return line;
}

function rtrim(s: string) {
  return s.replace(/\s+$/, "");
}

async function head(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}
