// lib/theme.ts
export type Theme = "system" | "light" | "dark";
const KEY = "gct-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const t = window.localStorage.getItem(KEY) as Theme | null;
  return t ?? "system";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  try { localStorage.setItem(KEY, theme); } catch {}
}

export function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return getStoredTheme();
}

/** Injected early in <head> to avoid FOUC */
export const inlineThemeScript = `
(function(){
  try {
    var key = 'gct-theme';
    var t = localStorage.getItem(key);
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (!t || t === 'system') {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.style.colorScheme = prefersDark ? 'dark' : 'light';
    } else {
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.style.colorScheme = (t === 'dark') ? 'dark' : 'light';
    }
  } catch(e){}
})();
`;
