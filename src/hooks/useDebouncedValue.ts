/**
 * Arama girdisini geciktirir (Instagram tarzı yazarken arama).
 *
 * Amaç: her tuş vuruşunda Firestore sorgusu açmamak. Gecikme dolmadan değer
 * değişirse önceki zamanlayıcı iptal edilir; bileşen sökülürse temizlenir.
 */
import { useEffect, useState } from "react";

export const SEARCH_DEBOUNCE_MS = 350;

export function useDebouncedValue<T>(value: T, delayMs = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
