import { useEffect, useRef, useState } from "react";
import { ChevronRight, Landmark, Loader2, RotateCw } from "lucide-react";
import type { Place } from "../types";
import { formatDistance, pickNearby } from "../utils/nearbyHistory";
import type { HistoricFetchResult } from "../utils/historicSites";

/**
 * P14 — Yer detayında "Yakındaki tarihî yerler".
 * - Overpass'e otomatik istek yok: yalnız kullanıcı düğmeye basınca, 800 m yarıçapla.
 * - Tarihçe yalnız OSM wikidata/wikipedia etiketinden gelir (tahmin yok); kaynak + lisans görünür.
 * - Ağ hatası sessiz kalmaz: eski kayıt varsa "eski olabilir", yoksa hata + tekrar dene.
 */
const RADIUS_M = 800;

interface Props {
  place: Place;
  onOpen?: (place: Place) => void;
}

export default function NearbyHistory({ place, onOpen }: Props) {
  const [state, setState] = useState<{ phase: "idle" | "loading" } | { phase: "done"; result: HistoricFetchResult }>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // Yer değişince üst bileşen key={place.id} ile sıfırlar; burada yalnız uçuştaki istek iptal edilir.
  useEffect(() => () => abortRef.current?.abort(), []);

  const load = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ phase: "loading" });
    const { fetchHistoricSitesDetailed } = await import("../utils/historicSites");
    const result = await fetchHistoricSitesDetailed({ lat: place.lat, lng: place.lng }, RADIUS_M, controller.signal);
    if (!controller.signal.aborted) setState({ phase: "done", result });
  };

  const items = state.phase === "done" ? pickNearby(place, state.result.places) : [];
  const status = state.phase === "done" ? state.result.status : null;

  return (
    <section aria-labelledby="nearby-history-title" className="mt-7 rounded-2xl border border-leaf/25 bg-white/[0.03] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <h3 id="nearby-history-title" className="flex items-center gap-2 text-[13px] font-semibold">
          <Landmark size={16} className="text-leaf" />Yakındaki tarihî yerler
        </h3>
        {state.phase === "done" && (
          <button type="button" onClick={() => void load()} aria-label="Yeniden yükle" className="grid size-9 place-items-center rounded-full text-mint/70 hover:text-mint">
            <RotateCw size={14} />
          </button>
        )}
      </div>

      {state.phase === "idle" && (
        <>
          <p className="mt-1 text-[12px] leading-relaxed text-mint/70">{RADIUS_M} m çevresindeki anıt, kalıntı ve yapıları OpenStreetMap'ten getirir.</p>
          <button type="button" onClick={() => void load()} className="mt-3 flex min-h-11 items-center gap-2 rounded-full border border-leaf/35 px-4 text-[13px] font-semibold text-leaf transition hover:bg-leaf/10">
            <Landmark size={15} />Çevredeki tarihi göster
          </button>
        </>
      )}

      {state.phase === "loading" && (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-mint/70" role="status"><Loader2 size={15} className="animate-spin" />Tarihî yerler aranıyor…</p>
      )}

      {state.phase === "done" && (
        <div aria-live="polite">
          {state.result.message && (
            <p role={status === "error" ? "alert" : "status"} className="mt-2 rounded-xl bg-sun/10 px-3 py-2 text-[12px] leading-relaxed text-sun">{state.result.message}</p>
          )}
          {status === "error" && (
            <button type="button" onClick={() => void load()} className="mt-2 flex min-h-11 items-center gap-2 rounded-full border border-leaf/35 px-4 text-[13px] font-semibold text-leaf">
              <RotateCw size={14} />Tekrar dene
            </button>
          )}
          {status !== "error" && items.length === 0 && (
            <p className="mt-2 text-[12px] text-mint/70">Bu çevrede OpenStreetMap'te kayıtlı tarihî yer yok.</p>
          )}
          {items.length > 0 && (
            <ul className="mt-2 divide-y divide-white/[0.06]">
              {items.map(({ place: site, km }) => (
                <li key={site.id}>
                  <button
                    type="button"
                    onClick={() => onOpen?.(site)}
                    disabled={!onOpen}
                    className="flex w-full items-start gap-3 py-2.5 text-left disabled:cursor-default"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[14px] font-semibold text-mint">{site.title}</span>
                        <span className="shrink-0 font-mono text-[11px] text-mint/70">{formatDistance(km)}</span>
                      </span>
                      {site.story ? (
                        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-mint/80">{site.story}</span>
                      ) : (
                        <span className="mt-0.5 block text-[12px] text-mint/70">Tarihçe kaydı yok · yalnız konum</span>
                      )}
                      <span className="mt-1 block text-[10.5px] text-mint/70">
                        {site.historySource ? `Wikipedia · ${site.historySource.license}` : "OpenStreetMap · ODbL"}
                      </span>
                    </span>
                    {onOpen && <ChevronRight size={16} className="mt-1 shrink-0 text-mint/70" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10.5px] leading-relaxed text-mint/70">
            Veri © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-2">OpenStreetMap katkıcıları</a> (ODbL) · Özetler Wikipedia (CC BY-SA 4.0), kısaltılmıştır.
          </p>
        </div>
      )}
    </section>
  );
}
