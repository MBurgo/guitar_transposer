"use client";

import { useEffect, useState } from "react";
import { Theme, getStoredTheme, applyTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const change = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted">Theme:</span>
      <select
        value={theme}
        onChange={(e) => change(e.target.value as Theme)}
        className="h-9 rounded-md border border-border bg-card px-2"
        aria-label="Theme"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
