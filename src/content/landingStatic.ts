/**
 * T17 — JavaScript'siz görünen içerik (tek kaynak).
 *
 * NEDEN VAR: 2026-10-28 denetiminde `index.html` içinde yalnız `<div id="root">`
 * vardı; JS çalışmayan bir tarayıcıda (ve JS render etmeyen bazı botlarda) sayfa
 * **tamamen boş** görünüyordu. Bu dosya, tanıtım sayfasının gerçek metnini
 * (başlık, üç adım, sık sorulanlar) tek yerde tutar; `vite.config.ts` bunu
 * derleme sırasında HTML'e `<noscript>` olarak gömer.
 *
 * KURALLAR:
 *  - Uydurma metin yok: her dize `LandingPage.tsx` içinde de geçer
 *    (`src/config/prerenderT17.test.ts` bunu kilitler).
 *  - Betik, stil, olay özniteliği yok: CSP `script-src` etkilenmez, no-JS
 *    kullanıcı tarayıcının varsayılan tipografisini görür.
 *  - `<noscript>` kullanılır: JS açık kullanıcı için düzen değişmez, yani
 *    CLS/LCP riski sıfırdır ve hidrasyon gerektirmez.
 */

export interface LandingStaticStep {
  title: string;
  text: string;
}

export interface LandingStaticFaq {
  question: string;
  answer: string;
}

export interface LandingStaticContent {
  heading: string;
  intro: string;
  stepsHeading: string;
  steps: LandingStaticStep[];
  faqHeading: string;
  faqs: LandingStaticFaq[];
  requirement: string;
}

export const LANDING_STATIC: LandingStaticContent = {
  heading: "Dünyayı merakınla keşfet.",
  intro:
    "Atlasia — 3B dünya haritasında ve uydu görüntülerinde gezginlerin bıraktığı izleri keşfet; rotanı planla, kendi keşfini haritaya bırak.",
  stepsHeading: "Nasıl çalışır?",
  steps: [
    {
      title: "Küreyi çevir",
      text: "Dünyanın dört bir yanındaki tarihî, doğal ve kültürel noktaları üç boyutlu haritada keşfet.",
    },
    {
      title: "Atlas AI ile planla",
      text: "Zamanını, ilgi alanını ve ulaşım biçimini seç; sana yakın duraklardan açıklanabilir bir rota oluştur.",
    },
    {
      title: "Hikâyeyi yerinde dinle",
      text: "Bir kültür noktasına yaklaştığında, izninle başlayan konum tabanlı sesli anlatımı dinle.",
    },
  ],
  faqHeading: "Sık sorulanlar",
  faqs: [
    {
      question: "Atlasia ücretsiz mi?",
      answer:
        "Evet. Uygulamanın tamamı ücretsizdir; reklam göstermiyoruz ve kişisel verini satmıyoruz. Gelecekte ücretli bir katman eklenirse önce mevcut kullanıcılara haber verilir.",
    },
    {
      question: "Konumum sürekli takip ediliyor mu?",
      answer:
        "Hayır. Konum yalnız sen açıkça izin verdiğinde ve ilgili ekranı kullanırken okunur. Sesli rehber, yakınlık uyarıları ve iz kaydı ayrı ayrı senin onayına bağlıdır; kapattığında çalışmaz.",
    },
  ],
  /** Dürüst sınır: uygulama tarayıcıda çalışır, harita için JS şart. */
  requirement:
    "Harita tarayıcında çalışır ve JavaScript gerektirir. Tarayıcın JavaScript'i engelliyorsa bu sayfadaki metinleri okuyabilir, uygulamayı JavaScript'i açtığın bir tarayıcıda kullanabilirsin.",
};

/** HTML özel karakterlerini kaçırır (metin sabit ama kural tek yerde dursun). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Derleme sırasında `index.html`'e gömülen `<noscript>` bloğu. */
export function renderLandingStaticHtml(): string {
  const steps = LANDING_STATIC.steps
    .map((step) => `        <li><strong>${escapeHtml(step.title)}</strong> — ${escapeHtml(step.text)}</li>`)
    .join("\n");
  const faqs = LANDING_STATIC.faqs
    .map(
      (faq) =>
        `        <dt><strong>${escapeHtml(faq.question)}</strong></dt>\n        <dd>${escapeHtml(faq.answer)}</dd>`,
    )
    .join("\n");

  return [
    "    <noscript>",
    '      <section aria-labelledby="static-heading" lang="tr">',
    `        <h1 id="static-heading">${escapeHtml(LANDING_STATIC.heading)}</h1>`,
    `        <p>${escapeHtml(LANDING_STATIC.intro)}</p>`,
    `        <h2>${escapeHtml(LANDING_STATIC.stepsHeading)}</h2>`,
    "        <ol>",
    steps,
    "        </ol>",
    `        <h2>${escapeHtml(LANDING_STATIC.faqHeading)}</h2>`,
    "        <dl>",
    faqs,
    "        </dl>",
    `        <p><small>${escapeHtml(LANDING_STATIC.requirement)}</small></p>`,
    "      </section>",
    "    </noscript>",
  ].join("\n");
}
