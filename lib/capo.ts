// lib/capo.ts
import { preferSharpsForKey, transposeNote } from "@/lib/transpose";

/**
 * Keys that generally offer the friendliest "open chord" shapes on guitar.
 * (We’re staying simple and opinionated for v1.)
 */
export const OPEN_SHAPE_KEYS = new Set(["C", "G", "D", "A", "E"]);

/**
 * Compute the "shapes key" you'd play with a given capo to SOUND in a target key.
 * If you capo at N, you play shapes N semitones LOWER than the sounding key.
 */
export function shapesKeyFor(targetKey: string, capoFret: number): string {
  const preferSharps = preferSharpsForKey(targetKey);
  return transposeNote(targetKey, -capoFret, preferSharps);
}

type CapoSuggestion = {
  capoFret: number;   // 0–11
  shapesKey: string;  // e.g. "G"
  reason: string;     // short human-friendly why
  score: number;      // internal sort score
};

/**
 * Score a capo position for "open-ness" and practicality.
 * Heuristics:
 *  - Prefer classic open-shape keys: +100 if shapesKey in C/G/D/A/E
 *  - Prefer lower frets (0–5 best), then gently penalize higher frets
 *  - Tiny nudge to avoid ties: prefer C/G/D/A/E order slightly
 */
function scoreCapo(shapesKey: string, capoFret: number): number {
  let score = 0;

  // Open shape keys are gold.
  if (OPEN_SHAPE_KEYS.has(shapesKey)) score += 100;

  // Prefer lower capo positions: 0–5 are most comfortable.
  if (capoFret <= 5) score += 20 - capoFret * 2; // 20,18,16,14,12,10
  else score += Math.max(0, 10 - (capoFret - 5) * 3); // 7,4,1,0,...

  // Slight bias by key to stabilize ranking across ties.
  const biasOrder = ["G", "C", "D", "A", "E"];
  const bias = Math.max(0, 5 - Math.max(0, biasOrder.indexOf(shapesKey))) * 0.5;
  score += bias;

  return score;
}

function reasonFor(shapesKey: string, capoFret: number): string {
  if (capoFret === 0 && OPEN_SHAPE_KEYS.has(shapesKey)) {
    return `No capo needed — classic open ${shapesKey} shapes`;
  }
  if (OPEN_SHAPE_KEYS.has(shapesKey)) {
    return `Open ${shapesKey} shapes (easy chord grips)`;
  }
  if (capoFret <= 2) {
    return `Low capo, comfortable reach`;
  }
  return `Usable option`;
}

/**
 * Suggest top capo positions for a target (sounding) key.
 * Returns sorted by descending usefulness.
 */
export function suggestCaposForTargetKey(targetKey: string): CapoSuggestion[] {
  const suggestions: CapoSuggestion[] = [];

  for (let fret = 0; fret <= 11; fret++) {
    const shapesKey = shapesKeyFor(targetKey, fret);
    const score = scoreCapo(shapesKey, fret);
    suggestions.push({
      capoFret: fret,
      shapesKey,
      score,
      reason: reasonFor(shapesKey, fret),
    });
  }

  // Sort best → worst
  suggestions.sort((a, b) => b.score - a.score);

  // Return the top handful (keep 5 for variety)
  return suggestions.slice(0, 5);
}
