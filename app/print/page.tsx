// app/print/page.tsx
import { decodeShareState } from "@/lib/share";
import {
  preferSharpsForKey,
  stepsFromKeys,
  transposeChordText,
  transposeNote,
} from "@/lib/transpose";
import ChordDiagram from "@/components/ChordDiagram";
import { findVoicingsFor } from "@/lib/chords";
import ShareRow from "@/components/ShareRow";
import PrintOnLoad from "@/components/PrintOnLoad";

/** Query params we care about */
type SP = { state?: string; auto?: string };

/* ---------------- Metadata (share previews per chart) ---------------- */
export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<unknown>;
}) {
  // Keep your original Promise<unknown> pattern
  const raw = await (searchParams ?? Promise.resolve({} as unknown));
  const obj = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;

  const token = typeof obj.state === "string" ? obj.state : "";

  let title = "Transposed Chart";
  let description =
    "Printable/shareable transposed chords (with optional capo shapes & diagrams).";

  // Dynamic OG image per chart:
  const ogImg = `/print/opengraph-image?state=${encodeURIComponent(token)}`;

  // IMPORTANT: do not include &auto in the URL shown to crawlers
  const url = `/print?state=${encodeURIComponent(token)}`;

  try {
    const d = decodeShareState(token);
    if (d?.title?.trim()) {
      title = `${d.title.trim()} — Transposed Chart`;
    } else if (d?.fromKey && d?.toKey) {
      title = `Transposed chart: ${d.fromKey} → ${d.toKey}`;
    }

    const bits: string[] = [];
    if (!d?.title) bits.push("Paste chords, pick keys, print.");
    if (d?.fromKey && d?.toKey) {
      bits.push(
        `From ${d.fromKey} to ${d.toKey}${d?.capoFret ? ` · Capo ${d.capoFret}` : ""}`
      );
    }
    if (bits.length) description = bits.join(" · ");
  } catch {
    // fall back to defaults
  }

  return {
    title,
    description,
    openGraph: { title, description, type: "article", url, images: [ogImg] },
    twitter: { card: "summary_large_image", title, description, images: [ogImg] },
  };
}

/* ---------------- Utilities ---------------- */
const CHORD_REGEX =
  /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|\d|\/|[A-G]|#|b|\+|\-|°|Δ)*$/i;

function extractUniqueChords(text: string): string[] {
  const tokens = text.split(/(\s+)/).filter(Boolean);
  const set = new Set<string>();
  for (const t of tokens) {
    if (/^\s+$/.test(t)) continue;
    if (CHORD_REGEX.test(t)) set.add(t);
  }
  return Array.from(set);
}

function transposeBlock(text: string, semitones: number, preferSharps: boolean) {
  return text
    .split(/(\s+)/)
    .map((part) =>
      CHORD_REGEX.test(part) ? transposeChordText(part, semitones, preferSharps) : part
    )
    .join("");
}

/* ---------------- Page ---------------- */
export default async function PrintPage({
  searchParams,
}: {
  searchParams?: Promise<unknown>;
}) {
  // Keep your original Promise<unknown> pattern
  const raw = await (searchParams ?? Promise.resolve({} as unknown));
  const obj = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;

  const sp: SP = {
    state: typeof obj.state === "string" ? obj.state : undefined,
    auto: typeof obj.auto === "string" ? obj.auto : undefined,
  };

  const decoded = decodeShareState(sp.state ?? "");
  if (!decoded) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Printable Chart</h1>
        <p className="mt-2 text-sm text-muted">
          Invalid or missing chart state. Please generate a link from the main page.
        </p>
      </main>
    );
  }

  const { title, input, fromKey, toKey, capoFret, showCapo, includeDiagrams } = decoded;

  const preferSharps = preferSharpsForKey(toKey);
  const steps = stepsFromKeys(fromKey, toKey);

  // Main transposed block
  const sounding = transposeBlock(input, steps, preferSharps);

  // Capo helper info
  const shapesKey = transposeNote(toKey, -capoFret, preferSharps);
  const capoShapes = showCapo ? transposeBlock(sounding, -capoFret, preferSharps) : "";

  // Build diagram sections (transposed + optionally capo)
  const diagSources: Array<{ title: string; text: string; capo?: number }> = [
    { title: `Transposed (sounds in ${toKey})`, text: sounding, capo: 0 },
  ];
  if (showCapo) {
    diagSources.push({
      title: `Capo shapes (key of ${shapesKey}, capo ${capoFret})`,
      text: capoShapes,
      capo: capoFret,
    });
  }

  const diagramBlocks =
    includeDiagrams
      ? diagSources.map((block, i) => {
          const uniques = extractUniqueChords(block.text);
          const entries = uniques
            .map((sym) => {
              const v = findVoicingsFor(sym);
              return { sym, v: v[0] };
            })
            .filter((e) => !!e.v);
          if (entries.length === 0) return null;
          return (
            <section key={`diags-${i}`} className="break-inside-avoid">
              <h3 className="mt-6 text-sm font-semibold">{block.title} — chord diagrams</h3>
              <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3 print:grid-cols-3">
                {entries.map((e) => (
                  <div key={`${i}-${e!.sym}`} className="rounded-xl border border-border p-2 text-foreground">
                    <div className="mb-1 text-xs font-medium">{e!.sym}</div>
                    <ChordDiagram shape={e!.v!} capoFret={block.capo ?? 0} />
                  </div>
                ))}
              </div>
            </section>
          );
        })
      : [];

  // Clean share path for header actions (no auto param)
  const sharePath = `/print?state=${encodeURIComponent(sp.state ?? "")}`;

  return (
    <main className="mx-auto max-w-3xl p-6">
      {/* Client-only; triggers window.print() when ?auto=1 */}
      <PrintOnLoad enable={sp.auto === "1"} />

      <header className="border-b border-border pb-3">
        {title?.trim() ? (
          <h1 className="text-2xl font-bold text-foreground">{title.trim()}</h1>
        ) : (
          <h1 className="text-xl font-semibold">Transposed Chart</h1>
        )}
        <div className="mt-1 text-sm text-muted">
          From <span className="font-medium text-foreground">{fromKey}</span> to{" "}
          <span className="font-medium text-foreground">{toKey}</span>
          {showCapo ? (
            <>
              {" "}• Capo <span className="font-medium text-foreground">{capoFret}</span>{" "}
              (play shapes in <span className="font-medium text-foreground">{shapesKey}</span>)
            </>
          ) : null}
        </div>

        {/* Share actions on print page too (icons + UTM, no native sheet) */}
        <div className="mt-3">
          <ShareRow
            sharePath={sharePath}
            title={title || `Transposed: ${fromKey} → ${toKey}`}
            message={`Burgo's Chord Transposer — easily transpose songs to different keys and check out different voicings`}
            showNative={false}
          />

        </div>
      </header>

      {/* Transposed chart */}
      <section className="mt-4">
        <h2 className="mb-2 text-sm font-medium text-foreground/80">
          Transposed (sounds in {toKey})
        </h2>
        <pre className="whitespace-pre-wrap break-words rounded-2xl border border-border bg-card p-3 font-mono text-[13px] text-foreground shadow-sm">
          {sounding}
        </pre>
      </section>

      {/* Capo shapes */}
      {showCapo && (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-medium text-foreground/80">
            Capo shapes to play (key of {shapesKey})
          </h2>
          <pre className="whitespace-pre-wrap break-words rounded-2xl border border-border bg-card p-3 font-mono text-[13px] text-foreground shadow-sm">
            {capoShapes}
          </pre>
        </section>
      )}

      {/* Optional diagrams grid */}
      {includeDiagrams && <>{diagramBlocks}</>}
    </main>
  );
}
