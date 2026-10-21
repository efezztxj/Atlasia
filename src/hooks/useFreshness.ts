import { useCallback, useEffect, useMemo, useState } from "react";
import type { Place } from "../types";
import { addPlaceVerification, subscribeRecentVerifications } from "../lib/verifications";
import {
  applyFreshness,
  summarizeFreshness,
  type PlaceFreshness,
  type PlaceVerification,
  type VerificationStatus,
} from "../utils/freshness";

export interface FreshnessController {
  verifications: PlaceVerification[];
  ready: boolean;
  freshnessFor: (placeId: string) => PlaceFreshness;
  withFreshness: (places: Place[]) => Place[];
  verify: (placeId: string, status: VerificationStatus, note?: string) => Promise<void>;
}

/**
 * Tek canlı dinleyici (limit 50) tüm ekranlar için yeterlidir; ücretsiz kota
 * korunur. Yer başına ayrı sorgu açılmaz.
 */
export function useFreshness(uid: string | undefined): FreshnessController {
  const [verifications, setVerifications] = useState<PlaceVerification[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const unsubscribe = subscribeRecentVerifications(
      (items) => {
        setVerifications(items);
        setReady(true);
      },
      (error) => {
        console.warn("[Atlasia] Tazelik doğrulamaları okunamadı:", error);
        setReady(true);
      },
    );
    return unsubscribe;
  }, [uid]);

  const freshnessFor = useCallback(
    (placeId: string) => summarizeFreshness(placeId, verifications),
    [verifications],
  );

  const withFreshness = useCallback(
    (places: Place[]) => applyFreshness(places, verifications),
    [verifications],
  );

  const verify = useCallback(
    async (placeId: string, status: VerificationStatus, note?: string) => {
      if (!uid) throw new Error("Doğrulama için giriş gerekli.");
      const created = await addPlaceVerification({ placeId, uid, status, note });
      // Canlı dinleyici gecikse bile kullanıcı kendi doğrulamasını hemen görsün.
      setVerifications((current) => [created, ...current].slice(0, 50));
    },
    [uid],
  );

  const value = useMemo(
    () => ({ verifications, ready, freshnessFor, withFreshness, verify }),
    [verifications, ready, freshnessFor, withFreshness, verify],
  );
  return value;
}
