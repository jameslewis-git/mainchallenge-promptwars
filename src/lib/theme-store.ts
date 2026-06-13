import { useState, useEffect } from "react";

export type Theme = "light" | "dark";

let currentTheme: Theme = "dark";
const listeners = new Set<(t: Theme) => void>();

if (typeof window !== "undefined") {
  currentTheme = (localStorage.getItem("theme") as Theme) || "dark";
  
  // Apply initial theme classes on first import in browser
  document.documentElement.setAttribute("data-theme", currentTheme);
  document.documentElement.classList.toggle("light", currentTheme === "light");
  document.documentElement.classList.toggle("dark", currentTheme === "dark");
}

export const themeStore = {
  getTheme() {
    return currentTheme;
  },
  setTheme(theme: Theme) {
    if (currentTheme === theme) return;
    currentTheme = theme;
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.classList.toggle("light", theme === "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
    listeners.forEach((l) => l(theme));
  },
  subscribe(listener: (t: Theme) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => themeStore.getTheme());

  useEffect(() => {
    setThemeState(themeStore.getTheme()); // Sync on mount
    return themeStore.subscribe((t) => setThemeState(t));
  }, []);

  const toggleTheme = () => {
    themeStore.setTheme(theme === "dark" ? "light" : "dark");
  };

  return { theme, toggleTheme, setTheme: themeStore.setTheme };
}
