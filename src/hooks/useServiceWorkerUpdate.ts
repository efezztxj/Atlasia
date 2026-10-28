/**
 * İŞ 5 — çevrimdışı kabuk güncelleme bildirimi.
 *
 * Davranış sözleşmesi:
 * - Yeni service worker `waiting` durumuna geçtiğinde **kullanıcıya sorulur**;
 *   `skipWaiting()` yalnız "Yenile" düğmesiyle, mesaj üzerinden çağrılır.
 *   (SW'nin `install` adımı artık sessizce `skipWaiting()` yapmıyor.)
 * - Düğme: `SKIP_WAITING` mesajı → `controllerchange` → tek seferlik yenileme.
 * - Kayıt başarısızsa uygulama çevrimiçi çalışmaya devam eder; hata yutulmaz.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const SKIP_WAITING = "SKIP_WAITING";

export interface UpdateState {
  /** Yeni sürüm indirildi ve bekliyor. */
  ready: boolean;
  /** Kullanıcı "Yenile" dedi; sayfa yenileniyor. */
  applying: boolean;
}

export function useServiceWorkerUpdate(register = true): UpdateState & { apply: () => void } {
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (!register || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (window.location.protocol === "file:") return;
    let active = true;

    const track = (registration: ServiceWorkerRegistration) => {
      const waiting = registration.waiting;
      if (waiting && navigator.serviceWorker.controller) {
        waitingRef.current = waiting;
        setReady(true);
        return;
      }
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (!active) return;
          // İlk kurulumda controller yoktur; o durumda bildirim gösterilmez.
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            waitingRef.current = installing;
            setReady(true);
          }
        });
      });
    };

    // İLK KURULUM ≠ GÜNCELLEME. `sw.js` `clients.claim()` çağırıyor; bu, ilk
    // ziyarette de `controllerchange` üretir. Eskiden bu olay koşulsuz yenileme
    // yapıyordu: her yeni ziyaretçi sayfayı ikinci kez baştan yüklüyordu (LCP'yi
    // boşa harcıyor; Lighthouse koşusunda "Execution context was destroyed"
    // hatasına da bu yol açıyordu — CI kanıtı: e395b33/a1cdaa2).
    // Kural: denetleyici ZATEN varken değiştiyse gerçek bir güncellemedir.
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (!hadController || reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    const start = () => {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        if (active) track(registration);
      }).catch((error: unknown) => {
        console.warn("Service worker kaydedilemedi; çevrimiçi modda devam ediliyor.", error);
      });
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      active = false;
      window.removeEventListener("load", start);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [register]);

  const apply = useCallback(() => {
    const waiting = waitingRef.current;
    if (!waiting) {
      window.location.reload();
      return;
    }
    setApplying(true);
    waiting.postMessage({ type: SKIP_WAITING });
    // Mesaj kanalı kurulamazsa kullanıcıyı bekletme.
    window.setTimeout(() => {
      if (!reloadedRef.current) window.location.reload();
    }, 1500);
  }, []);

  return { ready, applying, apply };
}
