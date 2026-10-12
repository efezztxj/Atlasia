import { useEffect, useState } from "react";

export type AppTheme = "dark" | "light";

const STORAGE_KEY = "atlasia.theme.v1";

function initialTheme(): AppTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute("content", theme === "light" ? "#f4f1e7" : "#021512");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* Tarayıcı depolaması kapalıysa tema yalnızca bu oturumda kalır. */
    }
  }, [theme]);

  return { theme, setTheme };
}
