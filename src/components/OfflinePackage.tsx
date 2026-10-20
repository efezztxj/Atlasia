import { useEffect, useState } from "react";
import { Download, HardDrive, Map as MapIcon, WifiOff } from "lucide-react";
import {
  bboxForView,
  cachedTileCount,
  estimateOfflineUsage,
  isEsriTile,
  prefetchTilesForBbox,
  type BBox,
} from "../utils/offlineCache";

interface Props {
  center: { lat: number; lng: number };
  bbox?: BBox | null;
  onClose?: () => void;
}

export default function OfflinePackage({ center, bbox, onClose }: Props) {
  const [usage, setUsage] = useState<{ usage: number; quota: number; percent: number | null } | null>(null);
  const [tileCount, setTileCount] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const effectiveBbox = bbox ?? bboxForView(center, 0.08);

  useEffect(() => {
    void estimateOfflineUsage().then(setUsage);
    void cachedTileCount().then(setTileCount);
    const id = setInterval(() => {
      void estimateOfflineUsage().then(setUsage);
      void cachedTileCount().then(setTileCount);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const handlePrefetch = async () => {
    setFetching(true);
    setDoneMsg(null);
    setProgress({ done: 0, total: 1 });
    try {
      const res = await prefetchTilesForBbox(effectiveBbox, 12, 15, (done, total) => setProgress({ done, total }));
      setDoneMsg(`Bölge önbelleğe alındı: ${res.fetched}/${res.total} karo. Esri karoları atlandı.`);
      const u = await estimateOfflineUsage();
      setUsage(u);
      setTileCount(await cachedTileCount());
    } catch (error) {
      void error;
      setDoneMsg("Önbellekleme sırasında bir sorun oluştu. İnternet bağlantını kontrol et.");
    } finally {
      setFetching(false);
    }
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="rounded-[18px] border border-leaf/20 bg-[#071f1a] p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-[14px] font-semibold text-mint">
          <MapIcon size={14} className="text-leaf" /> Çevrimdışı saha paketi
        </h3>
        {onClose && (
          <button type="button" onClick={onClose} className="text-[12px] text-mint/60 hover:text-mint">
            Kapat
          </button>
        )}
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-mint/70">
        Bu bölgeyi çevrimdışı kaydet: OpenFreeMap ve arazi karoları önbelleğe alınır. <b>Esri uydu karoları lisans gereği toplu önbelleğe alınmaz</b> — sokak/vektör harita ve pinler çevrimdışı görünür, uydu için internet gerekir.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl bg-white/5 p-2.5">
          <p className="flex items-center gap-1.5 text-mint/60">
            <HardDrive size={12} /> Depolama
          </p>
          <p className="mt-1 font-mono text-mint">
            {usage ? `${formatBytes(usage.usage)} / ${usage.quota ? formatBytes(usage.quota) : "—"}` : "—"}
            {usage?.percent !== null && usage?.percent !== undefined ? ` (${usage.percent}%)` : ""}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 p-2.5">
          <p className="flex items-center gap-1.5 text-mint/60">
            <WifiOff size={12} /> Önbellekteki karo
          </p>
          <p className="mt-1 font-mono text-mint">{tileCount !== null ? `${tileCount} karo` : "—"}</p>
        </div>
      </div>

      {progress && fetching && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-leaf transition-all"
              style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-mint/60">
            {progress.done} / {progress.total} karo önbelleğe alınıyor…
          </p>
        </div>
      )}

      {doneMsg && <p className="mt-3 rounded-xl bg-leaf/10 p-2.5 text-[12px] text-leaf">{doneMsg}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePrefetch}
          disabled={fetching}
          className="flex items-center gap-2 rounded-full bg-sun px-4 py-2 text-[12px] font-semibold text-ink disabled:opacity-50"
        >
          <Download size={14} /> {fetching ? "Kaydediliyor…" : "Bu bölgeyi çevrimdışı hazırla"}
        </button>
        <span className="self-center text-[10.5px] text-mint/50">Bbox: {effectiveBbox.west.toFixed(2)},{effectiveBbox.south.toFixed(2)} → {effectiveBbox.east.toFixed(2)},{effectiveBbox.north.toFixed(2)}</span>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-mint/40">
        Esri tile toplu indirme yasağı korunur — isEsriTile kontrolüyle Esri istekleri önbelleğe yazılmaz: {isEsriTile("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/0/0/0") ? "aktif" : "pasif"}.
      </p>
    </div>
  );
}
