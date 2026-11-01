import { useEffect, useState } from "react";
import type { MapPerfSnapshot } from "./MapView";

/**
 * Ekran üstü harita performans teşhisi.
 *
 * NEDEN: "Harita hâlâ gecikiyor" geri bildirimini sayıya bağlamak için
 * `window.atlasiaMapPerf()` var; ama telefonda konsol açmak zahmetli. Bu panel
 * yalnız adreste `?perf` varsa görünür ve aynı anlık görüntüyü ekranda yazar,
 * böylece kullanıcı ekran görüntüsü paylaşarak tek adımda veri verebilir.
 *
 * Üretimde varsayılan olarak **hiçbir şey** çizmez; parametre yoksa yalnız
 * `null` döner (ek yük yok).
 */
export function perfEnabled(search: string): boolean {
  return new URLSearchParams(search).has("perf");
}

export default function MapPerfOverlay({ search }: { search: string }) {
  const [snapshot, setSnapshot] = useState<MapPerfSnapshot | null>(null);

  useEffect(() => {
    if (!perfEnabled(search)) return undefined;
    const read = () => {
      const api = typeof window === "undefined" ? undefined : window.atlasiaMapPerf;
      if (api) setSnapshot(api());
    };
    read();
    const timer = globalThis.setInterval(read, 500);
    return () => globalThis.clearInterval(timer);
  }, [search]);

  if (!perfEnabled(search)) return null;

  const rows: [string, string][] = snapshot
    ? [
        ["kademe", `${snapshot.tier}${snapshot.dpr > 1.5 ? ` · dpr ${snapshot.dpr}` : ""}`],
        ["piksel", snapshot.pixelRatio.toFixed(2)],
        ["fps", snapshot.fps ? String(snapshot.fps) : "ölçülüyor"],
        ["adım", `${snapshot.step}/2`],
        ["arazi", snapshot.terrain ? "açık" : "kapalı"],
        ["gölge", snapshot.hillshade ? "açık" : "kapalı"],
        ["pin", String(snapshot.markers)],
      ]
    : [["durum", "harita bekleniyor"]];

  return (
    <div
      className="pointer-events-none fixed left-2 bottom-2 z-[70] rounded-xl border border-white/20 bg-black/80 p-2.5 font-mono text-[11px] leading-tight text-white"
      role="status"
      aria-label="Harita performans ölçümü"
    >
      <div className="mb-1 font-semibold text-sun">harita perf</div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-2">
          <span className="w-14 text-white/60">{label}</span>
          <span>{value}</span>
        </div>
      ))}
      <div className="mt-1 text-[10px] text-white/45">sürükle → sayı güncellenir</div>
    </div>
  );
}
