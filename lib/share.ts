// lib/share.ts
type ShareState = {
  title: string;           // NEW
  input: string;
  fromKey: string;
  toKey: string;
  capoFret: number;
  showCapo: boolean;
  includeDiagrams: boolean;
};

function base64urlEncode(str: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(str, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecode(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length % 4) || 4);
  if (typeof window === "undefined") {
    return Buffer.from(b64, "base64").toString("utf-8");
  }
  return atob(b64);
}

export function encodeShareState(state: ShareState): string {
  const payload = JSON.stringify(state);
  return base64urlEncode(payload);
}

export function decodeShareState(token: string): ShareState | null {
  try {
    const json = base64urlDecode(token);
    const obj = JSON.parse(json);
    if (
      typeof obj?.title === "string" &&            // NEW
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
  // auto=1 triggers the print dialog automatically
  return `${base}/print?state=${token}&auto=1`;
}
