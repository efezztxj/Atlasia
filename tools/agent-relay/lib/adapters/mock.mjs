import { CHUNK, sleep } from "./base.mjs";

/**
 * Demo/simülasyon adapter'ı. Gerçek agent'a dokunmaz; akışı test etmek ve
 * paneli göstermek için kullanılır. "Yazma" davranışını birebir taklit eder.
 */
export function createMockAdapter() {
  return {
    kind: "mock",
    async ready(agent) {
      return { ok: true, detail: `${agent.mock?.name || agent.name} (demo)` };
    },
    async send({ agent, text, onEvent }) {
      const cfg = agent.mock || {};
      onEvent({ type: "phase", phase: "typing" });
      onEvent({ type: "clear" });
      let typed = "";
      for (const piece of CHUNK(text, 26)) {
        typed += piece;
        onEvent({ type: "typed", text: typed });
        await sleep(12);
      }
      onEvent({ type: "phase", phase: "submitted" });
      await sleep(cfg.thinkMs ?? 700);
      onEvent({ type: "phase", phase: "answering" });

      const isReviewer = agent.role ? agent.role === "reviewer" : cfg.tone === "review";
      const reply = isReviewer ? reviewAnswer(text) : buildAnswer(text);
      let shown = "";
      for (const piece of CHUNK(reply, 34)) {
        shown += piece;
        onEvent({ type: "reply", text: shown });
        await sleep(16);
      }
      onEvent({ type: "phase", phase: "idle" });
      return { reply, captured: true };
    },
    async release() {},
  };
}

function requestLine(text) {
  const m = text.match(/İSTEK:\s*([\s\S]*?)(?:\n\n|$)/);
  return (m ? m[1] : text).trim().slice(0, 300);
}

function buildAnswer(text) {
  const req = requestLine(text);
  if (/ÖNCEKİ AJAN[\s\S]*RAPORU:/.test(text)) {
    return [
      "Denetçi raporunu aldım, maddeleri tek tek ele aldım.",
      "",
      "• SORUN 1 (girdi doğrulaması): düzelttim — boş/uzun girdi artık yakalanıyor,",
      "  uç durumlar için hata mesajı eklendi. Dosya: (demo) src/utils/validate.ts",
      "• SORUN 2 (hata mesajları): düzelttim — ayrık ve anlaşılır mesajlar.",
      "• KANIT İSTEMİ: bu sefer derleme çıktısını ekliyorum, iddia havada kalmıyor.",
      "",
      "DEVİR NOTU:",
      "- DÜZELTTİKLERİM: 2/2 madde.",
      "- DÜZELTMEDİKLERİM (GEREKÇE): yok.",
      "- DEĞİŞEN DOSYALAR: 2 dosya.",
      "- KALAN RİSKLER: kapsam dışında bir konu kalmadı.",
    ].join("\n");
  }
  return [
    "İsteği aldım, uyguladım.",
    "",
    `• Yorumladığım istek: ${req}`,
    "• Dokunduğum dosyalar: (demo) src/... , tools/...",
    "• Yaptığım iş: akışı kurdum, derleme geçti, kenar durumları not ettim.",
    "",
    "DEVİR NOTU:",
    "- NE YAPTIM: Çalışan sürüm hazır, iki adım doğrulandı.",
    "- DEĞİŞEN DOSYALAR: 2 dosya.",
    "- NASIL DOĞRULANIR: (demo) npm run build + elle iki senaryo.",
    "- AÇIK SORULAR / RİSKLER: Boş girdi ve çok uzun istek test edilmedi.",
  ].join("\n");
}

function reviewAnswer(text) {
  // İkinci denetim: karşısına DÜZELTTİKLERİM raporu geldiyse onay verir (erken çıkış demosu).
  if (/DÜZELTTİKLERİM/.test(text)) {
    return [
      "Düzeltme raporunu inceledim, iddiaları kanıtla karşılaştırdım.",
      "",
      "• Madde 1 (girdi doğrulaması): düzeltilmiş, uç durumlar kapatılmış. ✔",
      "• Madde 2 (hata mesajı): netleştirilmiş. ✔",
      "• Yeni risk görmedim; kapsam dışına çıkılmamış.",
      "",
      "- BULDUĞUM SORUNLAR: SORUN YOK",
      "- DOĞRULADIKLARIM: Ana akış + iki uç durum.",
      "- KARAR: ONAYLIYORUM",
    ].join("\n");
  }
  return [
    "İşi devraldım. Övmek için değil kırmak için baktım:",
    "",
    "• SORUN 1 · DÜZEY: YÜKSEK · NEREDE: girdi doğrulaması · NEDEN: boş ve çok uzun girdi ele alınmamış · ÖNERİ: şema doğrulaması ekle.",
    "• SORUN 2 · DÜZEY: ORTA · NEREDE: hata mesajları · NEDEN: kullanıcıya ne olduğunu söylemiyor · ÖNERİ: ayrık hata mesajları.",
    "• KANIT İSTEMİ: \"derleme geçti\" denmiş ama çıktı gösterilmemiş.",
    "",
    "- BULDUĞUM SORUNLAR: 2 (1 yüksek, 1 orta)",
    "- DOĞRULADIKLARIM: mutlu yol çalışıyor.",
    "- KARAR: DÜZELTME GEREKİYOR",
  ].join("\n");
}
