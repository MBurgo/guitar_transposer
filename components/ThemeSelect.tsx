"use client";

import { useEffect, useState } from "react";

type ThemeChoice = "system" | "light" | "dark";

export default function ThemeSelect({
  label = "Theme",
  compact = false,
}: { label?: string; compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeChoice>("system");

  // Hydrate from localStorage
  useEffect(() => {
    const stored = (localStorage.getItem("theme") as ThemeChoice | null) ?? "system";
    setTheme(stored);
  }, []);

  // Apply + persist
  useEffect(() => {
    const root = document.documentElement;
    if (!theme || theme === "system") {
      root.removeAttribute("data-theme");
      localStorage.setItem("theme", "system");
    } else {
      root.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "text-sm"}`}>
      {!compact && <span className="text-muted">{label}:</span>}
      <select
        aria-label="Theme"
        className="rounded-lg border border-border bg-card px-2 py-1"
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeChoice)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
