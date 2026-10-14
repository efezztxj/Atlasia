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

      const reply = cfg.tone === "review" ? reviewAnswer(text) : buildAnswer(text);
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
  return [
    "İsteği aldım, uyguladım.",
    "",
    `• Yorumladığım istek: ${req}`,
    "• Dokunduğum dosyalar: (demo) src/... , tools/...",
    "• Yaptığım iş: temel akışı kurdum, derleme geçti, kenar durumları not ettim.",
    "",
    "DEVİR NOTU:",
    "- NE YAPTIM: Çalışan ilk sürüm hazır, iki adım doğrulandı.",
    "- DEĞİŞEN DOSYALAR: 3 dosya.",
    "- AÇIK SORULAR: Boş girdi, çok uzun istek ve eşzamanlı kullanım test edilmedi.",
  ].join("\n");
}

function reviewAnswer(text) {
  const prev = text.match(/DEVİR NOTU:\n([\s\S]*)$/);
  return [
    "İşi devraldım, önceki ajanın çıktısını inceledim.",
    "",
    "• Bulduğum risk: girdi doğrulaması zayıf; iki uç durum eksik.",
    "• Düzelttim: doğrulama eklendi, hata mesajları netleştirildi.",
    prev ? "• Önceki nota dayanarak doğruladım: açık maddelerin 2/3'ünü kapattım." : "• Önceki not bulunamadı, istekten yeniden türettim.",
    "",
    "DEVİR NOTU:",
    "- DOĞRULADIM: Ana akış uçtan uca çalışıyor.",
    "- DÜZELTTİM: Girdi doğrulaması + hata mesajları.",
    "- KALAN İŞ: Senin kararın gereken tek konu var — aşağıdaki iki seçenekten hangisi?",
  ].join("\n");
}
