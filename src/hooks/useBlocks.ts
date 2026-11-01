import { useCallback, useEffect, useMemo, useState } from "react";
import { subscribeBlocks } from "../lib/moderation";

export function useBlocks(uid: string | undefined) {
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!uid) {
      setBlockedUids([]);
      setReady(false);
      return;
    }
    setReady(false);
    const unsub = subscribeBlocks(
      uid,
      (blocks) => {
        setBlockedUids(blocks.map((b) => b.blockedUid));
        setReady(true);
      },
      () => setReady(true),
    );
    return () => unsub();
  }, [uid]);

  const blockedSet = useMemo(() => new Set(blockedUids), [blockedUids]);
  // Kimlik sabit: engel listesi değişmedikçe `isBlocked` yeniden üretilmez.
  // Aksi hâlde ona bağlı `useMemo` filtreleri her render'da baştan hesaplanıyordu.
  const isBlocked = useCallback(
    (otherUid?: string | null) => !!otherUid && blockedSet.has(otherUid),
    [blockedSet],
  );

  return { blockedUids, blockedSet, isBlocked, ready };
}
