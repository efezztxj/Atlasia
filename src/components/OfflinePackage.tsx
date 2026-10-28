import { useEffect, useMemo, useRef, useState } from "react";
import { analytics } from "../lib/analytics";
import { Download, HardDrive, Loader2, Trash2, WifiOff, X } from "lucide-react";
import type { BBox } from "../utils/offlineCache";
import {
  OFFLINE_PACK_LIMITS,
  deletePack,
  downloadPack,
  estimatePack,
  listPacks,
  packsTotalBytes,
  type DownloadProgress,
  type OfflinePack,
} from "../utils/offlinePacks";

interface Props {
  /** Haritanın şu an görünen alanı; yoksa paket oluşturulamaz. */
  bbox: BBox | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const dateFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function OfflinePackage({ bbox }: Props) {
  const [packs, setPacks] = useState<OfflinePack[]>(() => listPacks());
  const [name, setName] = useState("");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const estimate = useMemo(() => (bbox ? estimatePack(bbox) : null), [bbox]);
  const busy = progress !== null;

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = async () => {
    if (!bbox || !estimate?.ok || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setMessage(null);
    setProgress({ done: 0, total: estimate.tiles, bytes: 0, failed: 0 });
    const result = await downloadPack({ name, bbox, signal: controller.signal, onProgress: setProgress });
    abortRef.current = null;
    setProgress(null);
    setPacks(listPacks());
    if ("message" in result) {
      analytics.offlinePack({ action: "download", ok: false });
      setMessage({ tone: "warn", text: result.message });
    } else if (result.pack.status === "complete") {
      analytics.offlinePack({ action: "download", ok: true });
      setName("");
      setMessage({ tone: "ok", text: `“${result.pack.name}” hazır: ${formatBytes(result.pack.bytes)}. Bu alan internetsiz açılır.` });
    } else {
      setMessage({ tone: "warn", text: `“${result.pack.name}” eksik kaydedildi. ${result.pack.note ?? ""}` });
    }
  };

  const remove = async (pack: OfflinePack) => {
    setDeleting(pack.id);
    try {
      await deletePack(pack.id);
      analytics.offlinePack({ action: "delete", ok: true });
      setMessage({ tone: "ok", text: `“${pack.name}” silindi.` });
    } catch {
      analytics.offlinePack({ action: "delete", ok: false });
      setMessage({ tone: "warn", text: "Paket silinemedi. Tekrar dene." });
    } finally {
      setDeleting(null);
      setPacks(listPacks());
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-leaf/20 bg-white/[0.04] p-4">
      <p className="text-[12px] leading-relaxed text-mint/70">
        Haritanın şu an görünen alanını (yakınlık {OFFLINE_PACK_LIMITS.minZoom}–{OFFLINE_PACK_LIMITS.maxZoom}) bu cihaza kaydeder. Yalnız <b>Karanlık</b> altlık (OpenFreeMap) kaydedilir; çevrimdışıyken onu seç. Uydu, Sokak, Topoğrafik ve 3B arazi lisans gereği kaydedilmez, onlar için internet gerekir.
      </p>

      {estimate && (
        <p className="mt-3 flex items-center gap-2 text-[12px] text-mint" aria-live="polite">
          <HardDrive className="size-4 shrink-0 text-leaf" />
          Tahmin: {estimate.tiles} karo · en çok ~{formatBytes(estimate.bytes)}
        </p>
      )}
      {!bbox && <p className="mt-3 text-[12px] text-sun">Önce haritayı açıp kaydetmek istediğin alana git.</p>}
      {estimate && !estimate.ok && <p className="mt-2 text-[12px] text-sun">{estimate.reason}</p>}

      <label className="mt-3 block text-[12px] text-mint/70">
        Paket adı
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          disabled={busy}
          placeholder="Örn. Kale çevresi"
          className="mt-1 h-11 w-full rounded-xl border border-leaf/20 bg-black/20 px-3 text-[14px] text-mint placeholder:text-mint/70"
        />
      </label>

      {progress && (
        <div className="mt-3" role="status">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-leaf transition-all" style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-mint/70">
            {progress.done} / {progress.total} dosya · {formatBytes(progress.bytes)}{progress.failed ? ` · ${progress.failed} hata` : ""}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {busy ? (
          <button type="button" onClick={() => abortRef.current?.abort()} className="flex min-h-11 items-center gap-2 rounded-full border border-leaf/35 px-4 text-[13px] font-semibold text-leaf">
            <X className="size-4" /> İndirmeyi iptal et
          </button>
        ) : (
          <button type="button" onClick={() => void start()} disabled={!estimate?.ok} className="flex min-h-11 items-center gap-2 rounded-full bg-sun px-4 text-[13px] font-semibold text-ink disabled:opacity-50">
            <Download className="size-4" /> Bu alanı indir
          </button>
        )}
      </div>

      {message && (
        <p role="status" className={message.tone === "ok" ? "mt-3 rounded-xl bg-leaf/10 p-2.5 text-[12px] text-leaf" : "mt-3 rounded-xl bg-sun/10 p-2.5 text-[12px] text-sun"}>
          {message.text}
        </p>
      )}

      {packs.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-mint">
            <WifiOff className="size-4 text-leaf" /> Kayıtlı paketler · {formatBytes(packsTotalBytes(packs))}
          </p>
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {packs.map((pack) => (
              <li key={pack.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-mint">{pack.name}</p>
                  <p className="text-[11px] text-mint/70">
                    {dateFormat.format(pack.createdAt)} · {formatBytes(pack.bytes)}
                    {pack.status === "incomplete" ? <span className="text-sun"> · eksik</span> : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(pack)}
                  disabled={deleting === pack.id || busy}
                  aria-label={`${pack.name} paketini sil`}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-mint/70 hover:text-mint disabled:opacity-50"
                >
                  {deleting === pack.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-mint/70">Harita verisi: OpenFreeMap © OpenMapTiles · © OpenStreetMap katkıcıları. Tek paket en çok {OFFLINE_PACK_LIMITS.maxTiles} karo / 50 MB.</p>
    </div>
  );
}
