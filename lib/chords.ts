// lib/chords.ts
// Broad, practical chord dictionary + on-the-fly barre generators.
//
// Positions array is low E (6th) → high E (1st).
// -1 = mute, 0 = open, 1.. = fret number relative to baseFret.
// Diagrams support baseFret labels and barres (see ChordDiagram.tsx).

export type Barre = {
  fromString: number; // 0 = low E ... 5 = high E
  toString: number;
  fret: number;       // relative to baseFret (1..)
};

export type Shape = {
  name: string;        // e.g., "F#m (E-shape barre @2)"
  shortName?: string;  // e.g., "F#m"
  positions: number[]; // length 6
  baseFret: number;    // absolute fret of the first rendered fret (nut is 1)
  barres?: Barre[];    // optional barre(s)
  quality?: "maj" | "min" | "7" | "maj7" | "m7" | "sus4" | "add9";
  family?: "open" | "barre-e" | "barre-a" | "alt";
};

/* -----------------------------------------------------------
 * Open-shape library (curated)
 * --------------------------------------------------------- */

export const OPEN_SHAPES: Record<string, Shape> = {
  // Majors
  C: { name: "C", shortName: "C", positions: [-1, 3, 2, 0, 1, 0], baseFret: 1, quality: "maj", family: "open" },
  D: { name: "D", shortName: "D", positions: [-1, -1, 0, 2, 3, 2], baseFret: 1, quality: "maj", family: "open" },
  E: { name: "E", shortName: "E", positions: [0, 2, 2, 1, 0, 0], baseFret: 1, quality: "maj", family: "open" },
  G: { name: "G", shortName: "G", positions: [3, 2, 0, 0, 0, 3], baseFret: 1, quality: "maj", family: "open" },
  A: { name: "A", shortName: "A", positions: [-1, 0, 2, 2, 2, 0], baseFret: 1, quality: "maj", family: "open" },
  F: { name: "F (lite)", shortName: "F", positions: [-1, -1, 3, 2, 1, 1], baseFret: 1, quality: "maj", family: "open" },

  // Maj7
  Cmaj7: { name: "Cmaj7", shortName: "Cmaj7", positions: [-1, 3, 2, 0, 0, 0], baseFret: 1, quality: "maj7", family: "open" },
  Amaj7: { name: "Amaj7", shortName: "Amaj7", positions: [-1, 0, 2, 1, 2, 0], baseFret: 1, quality: "maj7", family: "open" },
  Dmaj7: { name: "Dmaj7", shortName: "Dmaj7", positions: [-1, -1, 0, 2, 2, 2], baseFret: 1, quality: "maj7", family: "open" },
  Fmaj7: { name: "Fmaj7", shortName: "Fmaj7", positions: [-1, -1, 3, 2, 1, 0], baseFret: 1, quality: "maj7", family: "open" },

  // Minors
  Am: { name: "Am", shortName: "Am", positions: [-1, 0, 2, 2, 1, 0], baseFret: 1, quality: "min", family: "open" },
  Dm: { name: "Dm", shortName: "Dm", positions: [-1, -1, 0, 2, 3, 1], baseFret: 1, quality: "min", family: "open" },
  Em: { name: "Em", shortName: "Em", positions: [0, 2, 2, 0, 0, 0], baseFret: 1, quality: "min", family: "open" },

  // m7
  Am7: { name: "Am7", shortName: "Am7", positions: [-1, 0, 2, 0, 1, 0], baseFret: 1, quality: "m7", family: "open" },
  Em7: { name: "Em7", shortName: "Em7", positions: [0, 2, 2, 0, 3, 0], baseFret: 1, quality: "m7", family: "open" },

  // Dominant 7ths
  C7: { name: "C7", shortName: "C7", positions: [-1, 3, 2, 3, 1, 0], baseFret: 1, quality: "7", family: "open" },
  D7: { name: "D7", shortName: "D7", positions: [-1, -1, 0, 2, 1, 2], baseFret: 1, quality: "7", family: "open" },
  E7: { name: "E7", shortName: "E7", positions: [0, 2, 0, 1, 0, 0], baseFret: 1, quality: "7", family: "open" },
  G7: { name: "G7", shortName: "G7", positions: [3, 2, 0, 0, 0, 1], baseFret: 1, quality: "7", family: "open" },
  A7: { name: "A7", shortName: "A7", positions: [-1, 0, 2, 0, 2, 0], baseFret: 1, quality: "7", family: "open" },

  // sus4
  Asus4: { name: "Asus4", shortName: "Asus4", positions: [-1, 0, 2, 2, 3, 0], baseFret: 1, quality: "sus4", family: "open" },
  Dsus4: { name: "Dsus4", shortName: "Dsus4", positions: [-1, -1, 0, 2, 3, 3], baseFret: 1, quality: "sus4", family: "open" },

  // add9
  Cadd9: { name: "Cadd9", shortName: "Cadd9", positions: [-1, 3, 2, 0, 3, 3], baseFret: 1, quality: "add9", family: "open" },
  Gadd9: { name: "Gadd9", shortName: "Gadd9", positions: [3, 2, 0, 0, 3, 0], baseFret: 1, quality: "add9", family: "open" },
};

/* -----------------------------------------------------------
 * Barre-shape generators (E-shape, A-shape) for maj / min / 7
 * --------------------------------------------------------- */

// Note math helpers
const NOTE_ORDER_SHARPS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
type NoteName = typeof NOTE_ORDER_SHARPS[number];

function toSharp(note: string): NoteName {
  const n = note.replace("♯", "#").replace("♭", "b");
  const enh: Record<string, NoteName> = {
    "B#": "C", "Cb": "B",
    "E#": "F", "Fb": "E",
    "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#",
  };
  const sharped = enh[n] ?? n;
  if (!NOTE_ORDER_SHARPS.includes(sharped as NoteName)) throw new Error(`Bad note: ${note}`);
  return sharped as NoteName;
}

// Fret of a target note on a given open string (0..11)
function semitoneDistance(openNote: NoteName, target: NoteName): number {
  const a = NOTE_ORDER_SHARPS.indexOf(openNote);
  const b = NOTE_ORDER_SHARPS.indexOf(target);
  return (b - a + 12) % 12;
}

// Choose a comfortable base fret (prefer 1..5; then 6..9; else 10..12)
function chooseComfortableBaseFret(f: number): number {
  if (f === 0) return 12;    // avoid nut for barre diagrams; show octave
  if (f >= 1 && f <= 5) return f;
  if (f >= 6 && f <= 9) return f;
  return Math.max(1, Math.min(12, f)); // cap at 12
}

// E-string root (low E open is E)
function baseFretFor_Eshape(root: NoteName): number {
  const f = semitoneDistance("E", root);
  return chooseComfortableBaseFret(f);
}

// A-string root (A open is A)
function baseFretFor_Ashape(root: NoteName): number {
  const f = semitoneDistance("A", root);
  return chooseComfortableBaseFret(f);
}

// Shape templates (relative to baseFret)
const tplE_major = { positions: [1, 3, 3, 2, 1, 1] as number[], barre: { fromString: 0, toString: 5, fret: 1 }, family: "barre-e" as const };
const tplE_minor = { positions: [1, 3, 3, 1, 1, 1] as number[], barre: { fromString: 0, toString: 5, fret: 1 }, family: "barre-e" as const };
const tplE_7     = { positions: [1, 3, 1, 2, 1, 1] as number[], barre: { fromString: 0, toString: 5, fret: 1 }, family: "barre-e" as const };

const tplA_major = { positions: [-1, 1, 3, 3, 3, 1] as number[], barre: { fromString: 1, toString: 5, fret: 1 }, family: "barre-a" as const };
const tplA_minor = { positions: [-1, 1, 3, 3, 2, 1] as number[], barre: { fromString: 1, toString: 5, fret: 1 }, family: "barre-a" as const };
const tplA_7     = { positions: [-1, 1, 3, 1, 3, 1] as number[], barre: { fromString: 1, toString: 5, fret: 1 }, family: "barre-a" as const };

// Build one barre voicing
function makeBarre(root: NoteName, quality: "maj" | "min" | "7", system: "E" | "A", baseFret: number): Shape {
  const tpl =
    system === "E"
      ? quality === "maj" ? tplE_major : quality === "min" ? tplE_minor : tplE_7
      : quality === "maj" ? tplA_major : quality === "min" ? tplA_minor : tplA_7;

  const family = tpl.family;
  const barres: Barre[] = [ { ...tpl.barre } ];
  const positions = [...tpl.positions];

  const name = `${root}${quality === "min" ? "m" : quality === "7" ? "7" : ""} (${system}-shape barre @${baseFret})`;

  return {
    name,
    shortName: `${root}${quality === "min" ? "m" : quality === "7" ? "7" : ""}`,
    positions,
    baseFret,
    barres,
    quality,
    family,
  };
}

// Generate multiple comfortable voicings: prefer a low position and an alternate
function generateBarresFor(root: NoteName, quality: "maj" | "min" | "7"): Shape[] {
  const list: Shape[] = [];

  // E-shape primary at comfortable fret, plus optional octave alternative
  const eBase = baseFretFor_Eshape(root);
  if (eBase >= 1 && eBase <= 12) list.push(makeBarre(root, quality, "E", eBase));
  const eAlt = eBase + 12;
  if (eAlt >= 13 && eAlt <= 17) list.push(makeBarre(root, quality, "E", eAlt));

  // A-shape primary at comfortable fret, plus optional octave alternative
  const aBase = baseFretFor_Ashape(root);
  if (aBase >= 1 && aBase <= 12) list.push(makeBarre(root, quality, "A", aBase));
  const aAlt = aBase + 12;
  if (aAlt >= 13 && aAlt <= 17) list.push(makeBarre(root, quality, "A", aAlt));

  // Sort by baseFret ascending
  list.sort((x, y) => x.baseFret - y.baseFret);
  return list;
}

/* -----------------------------------------------------------
 * Symbol parsing / lookup
 * --------------------------------------------------------- */

function normalizeEnharmonic(root: string): NoteName {
  return toSharp(root);
}

export function parseChordSymbol(symbol: string): { root: NoteName; tail: string } | null {
  const m = symbol.match(/^([A-G](?:#|b)?)(.*)$/i);
  if (!m) return null;
  const root = normalizeEnharmonic(m[1]);
  const tail = (m[2] || "").toLowerCase();
  return { root, tail };
}

export function coarseQuality(tail: string): "maj" | "min" | "7" | "maj7" | "m7" | "sus4" | "add9" | "majLike" {
  if (tail.includes("maj7")) return "maj7";
  if (/\bm(?!aj)/.test(tail) && tail.includes("7")) return "m7";
  if (/\bm(?!aj)/.test(tail)) return "min";
  if (tail.includes("7")) return "7";
  if (tail.includes("sus4")) return "sus4";
  if (tail.includes("add9")) return "add9";
  return "majLike";
}

/**
 * Return a prioritized list of shapes (open first, then generated barres).
 * Coverage:
 *  - Open shapes: many majors/minors/7/maj7/m7/sus4/add9 (curated)
 *  - Barres: for ALL 12 roots, maj / min / 7, with E-shape and A-shape,
 *            often 2–4 voicings total (low + alternate positions)
 */
export function findVoicingsFor(symbol: string): Shape[] {
  const parsed = parseChordSymbol(symbol);
  if (!parsed) return [];

  const { root, tail } = parsed;
  const quality = coarseQuality(tail);

  // Try for an exact open shape for the coarse quality
  const openKey =
    quality === "min"  ? `${root}m` :
    quality === "7"    ? `${root}7` :
    quality === "maj7" ? `${root}maj7` :
    quality === "m7"   ? `${root}m7` :
    quality === "sus4" ? `${root}sus4` :
    quality === "add9" ? `${root}add9` :
    `${root}`;

  const voicings: Shape[] = [];

  if (OPEN_SHAPES[openKey]) {
    voicings.push(OPEN_SHAPES[openKey]);
  } else if (OPEN_SHAPES[root]) {
    // fallback to plain major open if user asked for e.g. Gmaj7 (we still show a G open)
    voicings.push(OPEN_SHAPES[root]);
  }

  // Generate barre shapes for maj/min/7 (broad coverage)
  if (quality === "min" || quality === "7" || quality === "majLike") {
    voicings.push(...generateBarresFor(root, quality === "min" ? "min" : quality === "7" ? "7" : "maj"));
  } else {
    // maj7 / m7 / sus4 / add9 → still include "majLike" or "min" barres as sensible default
    const fallback: "maj" | "min" = quality === "m7" ? "min" : "maj";
    voicings.push(...generateBarresFor(root, fallback));
  }

  // De-duplicate by (family + baseFret)
  const seen = new Set<string>();
  const unique = voicings.filter(v => {
    const key = `${v.family}|${v.baseFret}|${v.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: open first, then by ascending baseFret
  unique.sort((a, b) => {
    if ((a.family ?? "") === "open" && (b.family ?? "") !== "open") return -1;
    if ((b.family ?? "") === "open" && (a.family ?? "") !== "open") return 1;
    return a.baseFret - b.baseFret;
  });

  return unique;
}

/** Kept for compatibility with earlier code paths. */
export function mapSymbolToOpenKey(symbol: string): string | null {
  const parsed = parseChordSymbol(symbol);
  if (!parsed) return null;
  const { root, tail } = parsed;
  const qual = coarseQuality(tail);
  const key =
    qual === "min"  ? `${root}m` :
    qual === "7"    ? `${root}7` :
    qual === "maj7" ? `${root}maj7` :
    qual === "m7"   ? `${root}m7` :
    qual === "sus4" ? `${root}sus4` :
    qual === "add9" ? `${root}add9` :
    root;
  return key in OPEN_SHAPES ? key : null;
}
