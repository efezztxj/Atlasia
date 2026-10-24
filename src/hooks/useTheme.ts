import { useEffect, useState } from "react";
import { storageGet, storageSet } from "../utils/storage";

export type AppTheme = "dark" | "light" | "midnight";

const STORAGE_KEY = "atlasia.theme.v1";

function initialTheme(): AppTheme {
  const stored = storageGet(STORAGE_KEY);
  return stored === "light" || stored === "midnight" ? stored : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute("content", theme === "light" ? "#f4f1e7" : theme === "midnight" ? "#071827" : "#021512");
    storageSet(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme };
}
