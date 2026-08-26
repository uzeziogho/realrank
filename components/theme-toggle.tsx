"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Light/dark toggle. The initial theme is set by an inline script in the root
 * layout (before paint), following saved choice → system preference. This just
 * flips and persists it.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null;
    const isDark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(isDark ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
    const cls = document.documentElement.classList;
    cls.toggle("dark", next === "dark");
    cls.toggle("light", next === "light");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle light and dark theme"
      onClick={toggle}
    >
      {theme === "light" ? (
        <Moon className="size-4" />
      ) : theme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <span className="size-4" />
      )}
    </Button>
  );
}
