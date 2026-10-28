/**
 * T21/T18 — tanıtım sayfasının alt bloğu: sık sorulanlar + footer.
 *
 * NEDEN AYRI DOSYA: bu blok ekranın altında; ilk boya için gerekli değil ama
 * `entry` chunk'ında yer kaplıyordu (mobil 4G'de ilk boyaya doğrudan maliyet).
 * `LandingPage` bunu `lazy()` ile yükler: giriş paketi küçülür, blok ilk
 * render'da paralel indirilir. Metin ve bağlantılar **birebir** aynı kaldı
 * (`footerT18.test.ts` + `siteSurface.test.ts` bunu kilitler).
 */
import type { LegalDocumentType } from "../content/legal";
import { LANDING_STATIC, VERIFIED_CATALOG_COUNTS } from "../content/landingStatic";
import type { CtaPlacement } from "../lib/analytics";
import { openCookiePreferences } from "../lib/cookieConsent";

interface Props {
  /** Yasal pencere durumu sayfada kalır; footer yalnız haber verir. */
  onLegal: (type: LegalDocumentType) => void;
  onStart: (placement: CtaPlacement) => void;
}

/** Tanıtım sayfasından doğrudan okunabilen yasal metinler. */
const LEGAL_LINKS: { type: LegalDocumentType; label: string }[] = [
  { type: "privacy", label: "Gizlilik" },
  { type: "kvkk", label: "KVKK aydınlatma" },
  { type: "terms", label: "Kullanım koşulları" },
];

const FAQ = [
  {
    q: "Atlasia ücretsiz mi?",
    a: "Evet. Uygulamanın tamamı ücretsizdir; reklam göstermiyoruz ve kişisel verini satmıyoruz. Gelecekte ücretli bir katman eklenirse önce mevcut kullanıcılara haber verilir.",
  },
  {
    q: "Konumum sürekli takip ediliyor mu?",
    a: "Hayır. Konum yalnız sen açıkça izin verdiğinde ve ilgili ekranı kullanırken okunur. Sesli rehber, yakınlık uyarıları ve iz kaydı ayrı ayrı senin onayına bağlıdır; kapattığında çalışmaz.",
  },
  {
    q: "İnternet yokken çalışır mı?",
    a: "Yüklediğin harita paketi ve son uygulama kabuğu çevrimdışı açılır. Yeni iz bırakma, rota yayınlama ve sosyal işlemler bağlantı gerektirir; kayıtlar bağlantı gelince gönderilir.",
  },
  {
    q: "Verdiğim izleri kim görür?",
    a: "Yalnızca sen görürsün; izlerin varsayılan olarak özeldir. Yayınlamayı seçersen görünür olur ve dilediğinde geri alabilirsin.",
  },
];

export default function LandingFooter({ onLegal, onStart }: Props) {
  return (
    <>
        <section id="sss" aria-labelledby="sss-title" className="border-t border-white/10 bg-[#f1f0e9] px-5 py-16 text-[#102b2a] md:px-10 md:py-24 lg:px-16">
          <div className="mx-auto max-w-[900px]">
            {/* T20: sahte sayaç veya Firebase çağrısı olmadan doğrulanmış katalog kapsamı */}
            <div aria-label="Doğrulanmış içerik kapsamı" className="mb-12 grid gap-4 rounded-[22px] border border-[#102b2a]/12 bg-white/60 p-5 sm:grid-cols-3">
              <div>
                <p className="font-display text-[28px] leading-none font-bold text-[#102b2a]">{VERIFIED_CATALOG_COUNTS.guidePlaces}</p>
                <p className="mt-1.5 text-[12.5px] font-medium text-[#102b2a]/80">Seçilmiş rehber nokta</p>
              </div>
              <div>
                <p className="font-display text-[28px] leading-none font-bold text-[#102b2a]">{VERIFIED_CATALOG_COUNTS.siteTours}</p>
                <p className="mt-1.5 text-[12.5px] font-medium text-[#102b2a]/80">Antik kent sesli turu (Efes, Priene, Pompeii, Ostia)</p>
              </div>
              <div>
                <p className="font-display text-[28px] leading-none font-bold text-[#8f6224]">0</p>
                <p className="mt-1.5 text-[12.5px] font-medium text-[#102b2a]/80">Reklam ve takip pikseli · {LANDING_STATIC.catalogSummary}</p>
              </div>
            </div>

            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8f6224] uppercase">Sık sorulanlar</p>
            <h2 id="sss-title" className="font-display mt-3 text-[clamp(30px,4vw,48px)] leading-[1.02] font-semibold tracking-[-0.04em]">
              Aklında kalan sorular.
            </h2>
            <div className="mt-8 divide-y divide-[#102b2a]/10 border-y border-[#102b2a]/10">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold marker:hidden">
                    {item.q}
                    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full border border-[#102b2a]/20 text-[15px] leading-none transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-[720px] text-[13.5px] leading-7 text-[#102b2a]/75">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-[#020f0d] px-5 py-10 text-[11px] text-mint/45 md:px-10 lg:px-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-display text-lg font-semibold text-mint">atlasia<span className="text-sun">.</span></p>
              <p className="mt-2 max-w-[280px] leading-relaxed">Merak ettiğin her yer için sakin bir keşif defteri. Reklamsız, izinsiz konum okumaz.</p>
              {/* T18: tek dil — iddia ile <html lang> aynı olsun. */}
              <p className="mt-2 text-[11px] text-mint/35" lang="tr">Site dili: Türkçe (tr)</p>
            </div>
            <nav aria-label="Yasal" className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold tracking-[0.16em] text-mint/35 uppercase">Yasal</span>
              {LEGAL_LINKS.map(({ type, label }) => (
                <button key={type} type="button" onClick={() => onLegal(type)} className="min-h-8 text-left text-[12px] text-mint/70 transition hover:text-sun">
                  {label}
                </button>
              ))}
              {/* T18: rıza verildikten sonra fikir değiştirme yolu her ekranda
                  bulunmalı; panel yalnız uygulama ayarlarında kalmasın. */}
              <button
                type="button"
                onClick={openCookiePreferences}
                className="min-h-8 text-left text-[12px] text-mint/70 transition hover:text-sun"
              >
                Çerez tercihleri
              </button>
            </nav>
            <nav aria-label="Ürün" className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold tracking-[0.16em] text-mint/35 uppercase">Ürün</span>
              <a href="#kesfet" className="min-h-8 text-[12px] text-mint/70 transition hover:text-sun">Nasıl çalışır</a>
              <a href="#sss" className="min-h-8 text-[12px] text-mint/70 transition hover:text-sun">Sık sorulanlar</a>
              <button type="button" data-cta-level="tertiary" onClick={() => onStart("footer")} className="min-h-8 text-left text-[12px] text-sun">Keşfe başla</button>
            </nav>
          </div>
          <p className="mt-8 border-t border-white/5 pt-5">© {new Date().getFullYear()} Atlasia · Merak ettiğin her yer</p>
        </footer>
    </>
  );
}
