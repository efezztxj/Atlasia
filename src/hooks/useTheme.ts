import { useEffect, useState } from "react";
import { storageGet, storageSet } from "../utils/storage";

export type AppTheme = "dark" | "light";

const STORAGE_KEY = "atlasia.theme.v1";

function initialTheme(): AppTheme {
  return storageGet(STORAGE_KEY) === "light" ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute("content", theme === "light" ? "#f4f1e7" : "#021512");
    storageSet(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme };
}
