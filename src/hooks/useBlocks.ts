import { useEffect, useMemo, useState } from "react";
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
  const isBlocked = (otherUid?: string | null) => !!otherUid && blockedSet.has(otherUid);

  return { blockedUids, blockedSet, isBlocked, ready };
}
