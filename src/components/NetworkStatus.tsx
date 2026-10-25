import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Ağ durumu şeridi.
 *
 * Denetim K-13: `navigator.onLine` yalnız "bir ağ arayüzü var mı" der; captive
 * portal, DNS'siz ağ veya yanıt vermeyen arka uç durumunda uygulama kendini
 * çevrimiçi sanıyordu. `online` olayından sonra aynı kaynaklı küçük bir dosya
 * bir kez yoklanır; ulaşılamazsa "bağlantı doğrulanamadı" durumu gösterilir.
 * Yoklama isteğe bağlıdır: başarısız olsa da uygulama çalışmaya devam eder.
 */
/**
 * Yoklama yolu bilinçli olarak SW'nin önbelleklediği statik yollardan
 * (`/manifest.webmanifest`, `/assets/*`) seçilmedi: service worker o istekleri
 * cache'ten yanıtlayıp sahte "çevrimiçi" üretirdi. `/index.html` SW'nin
 * `isAllowedStaticPath` listesinde değil, yani gerçekten ağa çıkıyor.
 */
const PROBE_PATH = "/index.html";
const PROBE_TIMEOUT_MS = 6000;

export default function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [reachable, setReachable] = useState(true);

  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => {
      setOnline(false);
      setReachable(false);
    };
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, []);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    fetch(`${PROBE_PATH}?ping=${Date.now()}`, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!cancelled) setReachable(response.ok);
      })
      .catch(() => {
        if (!cancelled) setReachable(false);
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [online]);

  if (online && reachable) return null;

  return (
    <div role="status" className="network-status fixed top-[max(12px,env(safe-area-inset-top))] left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-full border border-sun/30 bg-[#06221b]/95 px-4 py-2 text-[12px] whitespace-nowrap text-sun shadow-xl">
      <WifiOff className="size-4" />
      {online ? "Bağlantı doğrulanamadı · canlı harita ve hesap işlemleri sınırlı" : "Çevrimdışısın · canlı harita ve hesap işlemleri sınırlı"}
    </div>
  );
}
