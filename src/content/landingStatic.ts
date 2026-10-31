/**
 * JavaScript çalıştırılmadan da okunabilen tanıtım içeriği (tek kaynak).
 *
 * NEDEN VAR: 2026-10-28 denetiminde `index.html` içinde yalnız `<div id="root">`
 * vardı; JS çalışmayan bir tarayıcıda (ve JS render etmeyen bazı botlarda) sayfa
 * **tamamen boş** görünüyordu. Bu dosya, tanıtım sayfasının gerçek metnini
 * (başlık, üç adım, sık sorulanlar) tek yerde tutar; `vite.config.ts` bunu
 * derleme sırasında React köküne statik başlangıç içeriği olarak gömer.
 *
 * KURALLAR:
 *  - Uydurma metin yok: her dize `LandingPage.tsx` içinde de geçer
 *    (`src/config/prerenderT17.test.ts` bunu kilitler).
 *  - Betik, stil, olay özniteliği yok: CSP `script-src` etkilenmez, no-JS
 *    kullanıcı tarayıcının varsayılan tipografisini görür.
 *  - React createRoot ilk render sırasında bu içeriği değiştirir; JS kapalıyken
 *    metin görünür kalır. Statik başlangıç ile uygulama arasında geçiş olabilir.
 */

export interface LandingStaticStep {
  title: string;
  text: string;
}

export interface LandingStaticFaq {
  question: string;
  answer: string;
}

export interface VerifiedCatalogCounts {
  guidePlaces: number;
  siteTours: number;
}

/**
 * T20 ↔ T11 (karar: doğrulanmış statik kapsam sayıları):
 * Landing sayfasına Firebase SDK'sı indirmeden ve sahte kullanıcı/rota sayacı
 * üretmeden yalnızca repodaki gerçek editör kataloğunun doğrulanmış kapsamı
 * gösterilir (`src/config/socialProofT20.test.ts` bu sayıları `GUIDE_PLACES` ve
 * `SITE_TOURS` uzunluklarıyla birebir kilitler).
 */
export const VERIFIED_CATALOG_COUNTS: VerifiedCatalogCounts = {
  guidePlaces: 28,
  siteTours: 4,
};

export interface LandingStaticContent {
  heading: string;
  intro: string;
  catalogSummary: string;
  details: string[];
  stepsHeading: string;
  steps: LandingStaticStep[];
  faqHeading: string;
  faqs: LandingStaticFaq[];
  requirement: string;
}

export const LANDING_STATIC: LandingStaticContent = {
  heading: "Dünyayı merakınla keşfet.",
  intro:
    "Atlasia — gerçek uydu görüntüleriyle dünyayı keşfet, gezginlerin bıraktığı küçük ipuçlarını bul ve kendi keşfini haritaya bırak.",
  catalogSummary:
    `Atlasia kapsamında ${VERIFIED_CATALOG_COUNTS.guidePlaces} seçilmiş rehber nokta ve ${VERIFIED_CATALOG_COUNTS.siteTours} antik kent sesli turu bulunur: Efes, Priene, Pompeii ve Ostia. 0 reklam ve takip pikseli.`,
  details: [
    "Uzaklara gitmek için önce merak etmek yeter. İlham veren rotalara göz at, sana yakın gelenleri kaydet ve kendi izini haritaya bırak.",
    "Atlasia yalnızca nereye gideceğini değil, zamanına göre hangi sırayla gezebileceğini de düşünür. Bir kültür noktasına yaklaştığında sesli anlatım sen onay verirsen başlar.",
    "Rahat, dengeli veya yoğun tempo. Yakın duraklar ve tahmini süre tek planda.",
    "Konum izni senin kontrolünde. Ses yalnızca dinlemeyi seçtiğinde başlar.",
    "Kendi keşfini bırak, daha sonra İzlerim bölümünden yönet.",
    "Konum, mikrofon veya ses kendiliğinden açılmaz. Her kritik işlem açık onay ister.",
  ],
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
    {
      question: "İnternet yokken çalışır mı?",
      answer:
        "Yüklediğin harita paketi ve son uygulama kabuğu çevrimdışı açılır. Yeni iz bırakma, rota yayınlama ve sosyal işlemler bağlantı gerektirir; kayıtlar bağlantı gelince gönderilir.",
    },
    {
      question: "Verdiğim izleri kim görür?",
      answer:
        "Yalnızca sen görürsün; izlerin varsayılan olarak özeldir. Yayınlamayı seçersen görünür olur ve dilediğinde geri alabilirsin.",
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

/** Derleme sırasında React köküne gömülen statik başlangıç içeriği. */
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
    '      <section aria-labelledby="static-heading" lang="tr">',
    `        <h1 id="static-heading">${escapeHtml(LANDING_STATIC.heading)}</h1>`,
    `        <p>${escapeHtml(LANDING_STATIC.intro)}</p>`,
    `        <p>${escapeHtml(LANDING_STATIC.catalogSummary)}</p>`,
    ...LANDING_STATIC.details.map((detail) => `        <p>${escapeHtml(detail)}</p>`),
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
  ].join("\n");
}

/** Görünür SSS ile aynı kaynaklardan üretilen güvenli JSON-LD. */
export function renderLandingFaqJsonLd(): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LANDING_STATIC.faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
