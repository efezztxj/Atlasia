import { useEffect, useState } from "react";
import { storageGet, storageSet } from "../utils/storage";

export type AppTheme = "dark" | "light";

const STORAGE_KEY = "atlasia.theme.v1";

function initialTheme(): AppTheme {
  // Açık tema yeni varsayılan; daha önce bilinçli olarak koyu seçilmiş
  // tercihleri koruyoruz.
  return storageGet(STORAGE_KEY) === "dark" ? "dark" : "light";
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute("content", theme === "light" ? "#ffffff" : "#021512");
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
