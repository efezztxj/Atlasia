import { useEffect, useState } from "react";
import { storageGet, storageSet } from "../utils/storage";

export type AppTheme = "dark" | "light" | "midnight";

const STORAGE_KEY = "atlasia.theme.v2";
/**
 * Eski anahtar. Burada saklanan `"light"` değeri kullanıcı tercihi değil
 * uygulamanın o zamanki **varsayılanıydı** (hook her açılışta yazıyordu).
 * Bu yüzden geçişte `"light"` koyuya çevrilir; yalnız bilinçli `"midnight"`
 * seçimi korunur.
 */
const LEGACY_STORAGE_KEY = "atlasia.theme.v1";

function isTheme(value: string | null): value is AppTheme {
  return value === "dark" || value === "light" || value === "midnight";
}

function initialTheme(): AppTheme {
  const stored = storageGet(STORAGE_KEY);
  if (isTheme(stored)) return stored;
  // Varsayılan görünüm koyu (2026-11-01 ürün kararı).
  return storageGet(LEGACY_STORAGE_KEY) === "midnight" ? "midnight" : "dark";
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
