// lib/transpose.ts

const SHARPS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
const FLATS  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"] as const;

type NoteName = (typeof SHARPS[number]) | (typeof FLATS[number]) | "Cb" | "B#" | "E#" | "Fb";

const ENHARMONIC_MAP: Record<string, number> = {
  "C":0, "B#":0,
  "C#":1, "Db":1,
  "D":2,
  "D#":3, "Eb":3,
  "E":4, "Fb":4,
  "F":5, "E#":5,
  "F#":6, "Gb":6,
  "G":7,
  "G#":8, "Ab":8,
  "A":9,
  "A#":10,"Bb":10,
  "B":11,"Cb":11,
};

const SHARP_KEYS = new Set(["G","D","A","E","B","F#","C#"]);
const FLAT_KEYS  = new Set(["F","Bb","Eb","Ab","Db","Gb","Cb"]);

export const ALL_KEYS = [
  "C","G","D","A","E","B","F#","C#",
  "F","Bb","Eb","Ab","Db","Gb","Cb",
] as const;

export function preferSharpsForKey(key: string): boolean {
  if (SHARP_KEYS.has(key)) return true;
  if (FLAT_KEYS.has(key)) return false;
  return true; // neutral keys lean sharp
}

function normNote(raw: string): NoteName | null {
  if (!raw) return null;
  const t = raw.replace("♯","#").replace("♭","b").trim();
  const head = t[0]?.toUpperCase();
  const acc = t[1] === "#" || t[1] === "b" ? t[1] : "";
  const note = (head + acc) as NoteName;
  return ENHARMONIC_MAP[note] !== undefined ? note : null;
}

function indexOf(note: NoteName): number {
  return ENHARMONIC_MAP[note];
}

function chooseSpelling(semitone: number, preferSharps: boolean): string {
  semitone = ((semitone % 12) + 12) % 12;
  return preferSharps ? SHARPS[semitone] : FLATS[semitone];
}

export function transposeNote(noteRaw: string, steps: number, preferSharps: boolean): string {
  const note = normNote(noteRaw);
  if (!note) return noteRaw;
  const idx = indexOf(note);
  const outIdx = ((idx + steps) % 12 + 12) % 12;
  return chooseSpelling(outIdx, preferSharps);
}

const CHORD_RE = /^([A-G](?:#|b)?)([^/\s]*)$/i;

export function transposeChordSymbol(symbol: string, steps: number, preferSharps: boolean): string {
  if (symbol.includes("/")) {
    const [top, bass] = symbol.split("/");
    return `${transposeChordSymbol(top, steps, preferSharps)}/${transposeChordSymbol(bass, steps, preferSharps)}`;
  }
  const m = symbol.match(CHORD_RE);
  if (!m) return symbol;
  const [, root, tail] = m;
  const newRoot = transposeNote(root, steps, preferSharps);
  return `${newRoot}${tail ?? ""}`;
}

export function transposeChordText(input: string, steps: number, preferSharps: boolean): string {
  const tokens = input.split(/(\s+)/);
  return tokens.map(tok => maybeTransposeToken(tok, steps, preferSharps)).join("");
}

function maybeTransposeToken(tok: string, steps: number, preferSharps: boolean): string {
  if (!tok || /^\s+$/.test(tok)) return tok;

  if (/[,\|\(\)\[\]]/.test(tok) && !tok.includes("/")) {
    return tok.split(/([,\|\(\)\[\]])/).map(piece =>
      isChordLike(piece) ? transposeChordSymbol(piece, steps, preferSharps) : piece
    ).join("");
  }

  return isChordLike(tok) ? transposeChordSymbol(tok, steps, preferSharps) : tok;
}

function isChordLike(s: string): boolean {
  return /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|\d|\/|[A-G]|#|b|\+|\-|°|Δ)*$/i.test(s);
}

export function stepsFromKeys(fromKey: string, toKey: string): number {
  const from = ENHARMONIC_MAP[fromKey] ?? ENHARMONIC_MAP[normNote(fromKey) ?? "C"];
  const to   = ENHARMONIC_MAP[toKey] ?? ENHARMONIC_MAP[normNote(toKey) ?? "C"];
  return to - from;
}
