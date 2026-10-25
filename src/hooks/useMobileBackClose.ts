import { useEffect, useRef } from "react";

/**
 * Mobil geri tuşu / geri kaydırma jesti için katman kapatma.
 *
 * NEDEN VAR: Telefonda bir panel (keşif, arama, topluluk, ayarlar…) açıkken
 * geri tuşuna basmak uygulamadan çıkıyordu; kullanıcı açık katmanı kapatmak
 * için ekrandaki küçük "×" düğmesini aramak zorundaydı. Android'de geri tuşu,
 * iOS'ta kenardan geri kaydırma jesti bu uygulamada da katman kapatmalıdır.
 *
 * NASIL: Katman açıldığında geçmişe işaretli bir kayıt eklenir. Geri tuşu bu
 * kaydı tüketince `onClose` çağrılır; uygulama kapanmaz. Katman başka bir
 * yolla (ekrandaki düğmeyle) kapatılırsa eklenen kayıt sessizce geri alınır,
 * aksi hâlde geri tuşu bir sonraki basışta ölü bir adımda takılırdı.
 *
 * Tek kanca örneği beklenir (App kökü): açık katmanların en üstteki kapatıcısı
 * buraya verilir. Böylece iç içe katmanlarda geçmiş yığını şişmez.
 */

const LAYER_MARKER = "__atlasiaBackLayer";
let layerSequence = 0;

type HistoryState = Record<string, unknown> | null;

function currentState(): HistoryState {
  const state: unknown = window.history.state;
  return state && typeof state === "object" ? (state as Record<string, unknown>) : null;
}

export function useMobileBackClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    // Her katman açılışına kendi işareti: temizlikte yalnız kendi kaydımızı
    // geri alırız, üstteki katmanın kaydına dokunmayız.
    layerSequence += 1;
    const token = `${LAYER_MARKER}:${layerSequence}`;
    window.history.pushState({ ...(currentState() ?? {}), [LAYER_MARKER]: token }, "");

    const handlePop = () => {
      closeRef.current();
    };
    window.addEventListener("popstate", handlePop);

    return () => {
      window.removeEventListener("popstate", handlePop);
      const state = currentState();
      if (state?.[LAYER_MARKER] === token) window.history.back();
    };
  }, [open]);
}
