"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type ThemeToggleProps = {
  showLabel?: boolean;
};

export function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setTheme(nextTheme);
  };

  if (!mounted) {
    const buttonPlaceholder = (
      <div className="h-9 w-9 rounded-lg border border-slate-200/50 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] shrink-0" />
    );
    if (showLabel) {
      return (
        <div className="flex items-center gap-2">
          {buttonPlaceholder}
          <span className="opacity-0">Dark Mode</span>
        </div>
      );
    }
    return buttonPlaceholder;
  }

  const buttonElement = (
    <button
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all focus:outline-none duration-250 shrink-0"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      type="button"
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4 text-pitch-400" />
      ) : (
        <Sun className="h-4 w-4 text-amber-500" />
      )}
    </button>
  );

  if (showLabel) {
    return (
      <div className="flex items-center gap-2">
        {buttonElement}
        <span className="capitalize">{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
      </div>
    );
  }

  return buttonElement;
}
