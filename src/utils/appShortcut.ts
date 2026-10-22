/**
 * İŞ 5 — manifest `shortcuts` hedefleri.
 *
 * Kısayollar (`?tab=…`) yalnız **var olan** eylemleri açar; yeni bir sayfa
 * ya da rota eklemez. Bilinmeyen değer yok sayılır (uygulama normal açılır).
 * Parametre okunduktan sonra adres çubuğundan silinir (`stripShortcutParam`),
 * böylece yenilemede aynı eylem ikinci kez tetiklenmez.
 */
export const SHORTCUT_PARAM = "tab";

export type ShortcutAction = "explore" | "add" | "profile";

const SHORTCUT_TABS: Record<string, ShortcutAction> = {
  kesfet: "explore",
  "iz-birak": "add",
  profil: "profile",
  // Türkçe küçük harfte "PROFIL" → "profıl" (noktasız ı); aynı eyleme gider.
  "profıl": "profile",
};

/** `?tab=` değerini eyleme çevirir; tanınmayan ya da boş değerde `null`. */
export function parseShortcutTab(search: string): ShortcutAction | null {
  const raw = new URLSearchParams(search).get(SHORTCUT_PARAM);
  if (!raw) return null;
  return SHORTCUT_TABS[raw.trim().toLocaleLowerCase("tr")] ?? null;
}

/** Adresten yalnız `tab` parametresini çıkarır; diğer parametreler korunur. */
export function stripShortcutParam(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(SHORTCUT_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}
