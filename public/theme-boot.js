/**
 * Atlasia — tema önyüklemesi (A1).
 *
 * NEDEN AYRI DOSYA: Bu kod daha önce `index.html` içinde satır içi bir
 * `<script>` olarak duruyordu. Üretim CSP'si `script-src 'self'` olduğu için
 * satır içi betik **engelleniyordu**: tema ilk karede uygulanmıyor, kayıtlı
 * tercih "midnight" iken sayfa açık temayla boyanıp sonra atlıyordu (FOUC) ve
 * konsolda CSP ihlali birikiyordu. Ayrı dosya, 'unsafe-inline' eklemeden aynı
 * işi yapar.
 *
 * KURAL: Bu dosya ilk boyamadan ÖNCE, senkron ve `<head>` içinde çalışmalıdır;
 * `defer`/`async` eklenirse amaç kaybolur. Renk paleti `src/hooks/useTheme.ts`
 * ile aynı olmalıdır (test: `src/config/themeBoot.test.ts`).
 */
(function () {
  var NIGHT_COLOR = "#021512";
  var MIDNIGHT_COLOR = "#071827";
  var LIGHT_COLOR = "#ffffff";
  // Varsayılan görünüm koyu (2026-11-01). Açık tema Ayarlar'dan seçilebilir.
  var DEFAULT_THEME = "dark";
  var STORAGE_KEY = "atlasia.theme.v2";
  // Eski anahtardaki "light" kullanıcı tercihi değil, eski VARSAYILANdı:
  // geçişte koyuya çevrilir, yalnız bilinçli "midnight" korunur.
  var LEGACY_STORAGE_KEY = "atlasia.theme.v1";
  var theme = DEFAULT_THEME;
  try {
    var storedTheme = localStorage.getItem(STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "midnight") {
      theme = storedTheme;
    } else if (localStorage.getItem(LEGACY_STORAGE_KEY) === "midnight") {
      theme = "midnight";
    }
  } catch (error) {
    // Depolama kapalı olabilir; erişilebilir varsayılan koyu tema kalır.
  }
  var root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === "light" ? "light" : "dark";
  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.content = theme === "light" ? LIGHT_COLOR : theme === "midnight" ? MIDNIGHT_COLOR : NIGHT_COLOR;
  }
})();
