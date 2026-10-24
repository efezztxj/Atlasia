import { useEffect, useState } from "react";
import { storageGet, storageSet } from "../utils/storage";

export type AppTheme = "dark" | "light" | "midnight";

const STORAGE_KEY = "atlasia.theme.v1";

function initialTheme(): AppTheme {
  // Açık tema varsayılan; bilinçli koyu ve gece tercihleri korunur.
  const stored = storageGet(STORAGE_KEY);
  return stored === "dark" || stored === "midnight" ? stored : "light";
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute(
    "content",
    theme === "light" ? "#ffffff" : theme === "midnight" ? "#071827" : "#021512",
  );
}

/** İlk React boyamasından önce kayıtlı temayı uygula; renk sıçramasını önler. */
export function initTheme() {
  applyTheme(initialTheme());
}

export function useTheme() {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);

  useEffect(() => {
    applyTheme(theme);
    storageSet(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme };
}
