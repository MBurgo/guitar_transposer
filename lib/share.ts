// lib/share.ts
export type ShareState = {
  title: string;           // keep required fields exactly as in your current file
  input: string;
  fromKey: string;
  toKey: string;
  capoFret: number;
  showCapo: boolean;
  includeDiagrams: boolean;
};

/* ---------------- Unicode‑safe Base64 helpers ----------------
   Works in browser, Node, and Edge runtimes.
---------------------------------------------------------------- */

function toBase64Utf8(str: string): string {
  // Encode to bytes (UTF‑8)
  const bytes =
    typeof TextEncoder !== "undefined"
      ? new TextEncoder().encode(str)
      : // Fallback for older Node
        (Buffer.from(str, "utf-8") as unknown as Uint8Array);

  // Convert bytes -> binary string
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);

  // Use btoa when available (browser/edge); otherwise Node Buffer
  if (typeof btoa === "function") return btoa(bin);
  return Buffer.from(bytes).toString("base64");
}

function fromBase64Utf8(b64: string): string {
  let bytes: Uint8Array;

  if (typeof atob === "function") {
    // Browser/edge path
    const bin = atob(b64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    // Node path
    bytes = Buffer.from(b64, "base64");
  }

  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  }
  // Fallback (older Node)
  return Buffer.from(bytes).toString("utf-8");
}

// Make tokens URL‑safe and drop '=' padding
function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromUrlSafe(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  return pad ? b64 + "=".repeat(4 - pad) : b64;
}

/* ---------------- Public API (unchanged) ---------------- */

export function encodeShareState(state: ShareState): string {
  const json = JSON.stringify(state);
  const b64 = toBase64Utf8(json);
  return toUrlSafe(b64);
}

export function decodeShareState(token: string): ShareState | null {
  try {
    const b64 = fromUrlSafe(token);
    const json = fromBase64Utf8(b64);
    const obj = JSON.parse(json);

    // Keep your strict runtime checks
    if (
      typeof obj?.title === "string" &&
      typeof obj?.input === "string" &&
      typeof obj?.fromKey === "string" &&
      typeof obj?.toKey === "string" &&
      typeof obj?.capoFret === "number" &&
      typeof obj?.showCapo === "boolean" &&
      typeof obj?.includeDiagrams === "boolean"
    ) {
      return obj as ShareState;
    }
    return null;
  } catch {
    return null;
  }
}

export function makePrintUrl(state: ShareState, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const token = encodeShareState(state);
  // auto=1 can still trigger the print dialog automatically on the print route
  return `${base}/print?state=${token}&auto=1`;
}
