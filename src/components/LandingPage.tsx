import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { CtaPlacement } from "../lib/analytics";
import {
  ArrowDown,
  ArrowRight,
  Compass,
  Headphones,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  WifiOff,
  Ban,
  Menu,
  X,
} from "lucide-react";
import type { LegalDocumentType } from "../content/legal";

const LegalNotice = lazy(() => import("./LegalNotice"));
// T18/T21: alt blok (SSS + footer) giriş paketinde değil.
const LandingFooter = lazy(() => import("./LandingFooter"));

interface Props {
  /** Birincil eylemin hangi yerleşimden geldiği (T2 huni kırılımı). */
  onStart: (placement: CtaPlacement) => void;
}

/** Kısa, dürüst güven maddeleri — abartısız. */
const TRUST = [
  { icon: Ban, text: "Reklam ve takip pikseli yok" },
  { icon: ShieldCheck, text: "Konum yalnız senin onayınla" },
  { icon: WifiOff, text: "Çevrimdışı paket desteği" },
];

/** Mobil menü bağlantıları — masaüstü menüsüyle aynı hedefler (T13). */
const MENU_LINKS = [
  { href: "#kesfet", label: "Keşfet" },
  { href: "#nasil", label: "Nasıl çalışır?" },
  { href: "#film", label: "Tanıtım filmi" },
  { href: "#sss", label: "Sık sorulanlar" },
] as const;

const features = [
  {
    icon: Compass,
    number: "01",
    title: "Küreyi çevir",
    text: "Dünyanın dört bir yanındaki tarihî, doğal ve kültürel noktaları üç boyutlu haritada keşfet.",
  },
  {
    icon: Sparkles,
    number: "02",
    title: "Atlas AI ile planla",
    text: "Zamanını, ilgi alanını ve ulaşım biçimini seç; sana yakın duraklardan açıklanabilir bir rota oluştur.",
  },
  {
    icon: Headphones,
    number: "03",
    title: "Hikâyeyi yerinde dinle",
    text: "Bir kültür noktasına yaklaştığında, izninle başlayan konum tabanlı sesli anlatımı dinle.",
  },
];

export default function LandingPage({ onStart }: Props) {
  const [legal, setLegal] = useState<LegalDocumentType | null>(null);
  // T13: 768 px altında menü erişimi yoktu. Hamburger tam ekran panel açar;
  // Escape kapatır, Tab panel içinde döner, kapanınca odak düğmeye döner.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const panel = menuPanelRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);

    (panel?.querySelector<HTMLElement>("a[href]") ?? focusables()[0])?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {/* T14: klavyeyle gelen kullanıcı hero'nun tamamını geçmek zorunda kalmasın. */}
      <a
        href="#kesfet"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-[#f3c870] focus:px-4 focus:py-3 focus:text-[13px] focus:font-bold focus:text-[#142019]"
      >
        İçeriğe geç
      </a>

    <main className="landing-page h-dvh overflow-y-auto scroll-smooth bg-[#020d17] text-white">
      <section className="relative isolate min-h-dvh overflow-hidden border-b border-white/10">
        <img
          src="/images/atlasia-earth-hero.jpg"
          alt="Gece ışıklarıyla Avrupa, Akdeniz ve Türkiye'nin uzaydan görünümü"
          className="absolute inset-0 -z-20 size-full object-cover object-[66%_center]"
          fetchPriority="high"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(1,10,18,.96)_0%,rgba(1,10,18,.76)_34%,rgba(1,10,18,.18)_68%,rgba(1,10,18,.26)_100%)] max-md:bg-[linear-gradient(180deg,rgba(1,10,18,.7)_0%,rgba(1,10,18,.43)_38%,rgba(1,10,18,.96)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_16%,rgba(234,181,79,.13),transparent_30%)]" />

        <header className="mx-auto flex h-[82px] w-full max-w-[1440px] items-center justify-between border-b border-white/10 px-5 md:h-[92px] md:px-10 lg:px-16">
          <a href="#top" className="flex items-center gap-3" aria-label="Atlasia başlangıç">
            <span className="grid size-9 place-items-center rounded-full border border-white/30"><Compass size={18} strokeWidth={1.5} /></span>
            <span className="font-display text-[25px] font-bold tracking-tight">atlasia<span className="text-sun">.</span></span>
          </a>
          <nav aria-label="Tanıtım menüsü" className="hidden items-center gap-8 text-[13px] text-white/75 md:flex">
            {MENU_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className="transition hover:text-white">{label}</a>
            ))}
            <button type="button" onClick={() => setLegal("privacy")} className="transition hover:text-white">Gizlilik</button>
          </nav>
          <div className="flex items-center gap-2">
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="landing-menu"
              aria-label="Menü"
              onClick={() => setMenuOpen((value) => !value)}
              className="grid size-11 place-items-center border border-white/35 bg-black/15 text-white md:hidden"
            >
              {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            </button>
            <button type="button" data-cta-level="secondary" onClick={() => onStart("header")} className="group hidden min-h-11 items-center gap-2 px-2 text-[12px] font-semibold text-white/75 transition hover:text-white sm:flex md:px-3">
              Keşfe başla <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </header>

        {menuOpen && (
          <div
            id="landing-menu"
            ref={menuPanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menüsü"
            className="fixed inset-0 z-[95] flex flex-col gap-2 bg-[#020d17] px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-[22px] font-bold">atlasia<span className="text-sun">.</span></span>
              <button type="button" aria-label="Menüyü kapat" onClick={() => { closeMenu(); menuButtonRef.current?.focus(); }} className="grid size-11 place-items-center border border-white/30">
                <X size={18} aria-hidden />
              </button>
            </div>
            <nav aria-label="Mobil menü" className="mt-6 flex flex-col">
              {MENU_LINKS.map(({ href, label }) => (
                <a key={href} href={href} onClick={closeMenu} className="border-b border-white/10 py-4 text-[18px] text-white/90">{label}</a>
              ))}
              <button type="button" onClick={() => { closeMenu(); setLegal("privacy"); }} className="border-b border-white/10 py-4 text-left text-[18px] text-white/90">Gizlilik</button>
            </nav>
            <button
              type="button"
              data-cta-level="primary"
              onClick={() => { closeMenu(); onStart("header"); }}
              className="mt-6 flex min-h-[52px] items-center justify-center gap-3 bg-[#f3c870] px-6 text-[14px] font-bold text-[#142019]"
            >
              Keşfe başla <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        )}

        <div id="top" className="mx-auto flex min-h-[calc(100dvh-82px)] w-full max-w-[1440px] items-end px-5 pt-24 pb-20 md:min-h-[calc(100dvh-92px)] md:items-center md:px-10 md:pt-16 md:pb-24 lg:px-16">
          <div className="max-w-[700px]">
            <p className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.32em] text-[#f3c870] uppercase md:text-[12px]"><span className="h-px w-8 bg-[#f3c870]" />Dünya seni bekliyor</p>
            <div aria-hidden="true" className="font-display mt-7 text-[clamp(68px,11vw,160px)] leading-[0.78] font-semibold tracking-[-0.075em] text-white">atlasia<span className="text-sun">.</span></div>
            <h1 className="font-display mt-7 max-w-[690px] text-[clamp(29px,4vw,55px)] leading-[1.02] font-medium tracking-[-0.045em]">Dünyayı <span className="text-[#f3c870]">merakınla</span> keşfet.</h1>
            <p className="mt-6 max-w-[500px] text-[14px] leading-7 text-white/70 md:text-[16px]">Yeni yerler, gerçek gezgin izleri ve bulunduğun noktada canlanan hikâyeler. Bir sonraki keşfin burada başlıyor.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" data-cta-level="primary" onClick={() => onStart("hero")} className="group flex min-h-[56px] items-center gap-8 bg-[#f3c870] px-6 text-[13px] font-bold text-[#142019] transition hover:bg-white md:px-7">Dünyayı keşfet <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></button>
              <a href="#nasil" className="flex min-h-[56px] items-center gap-2 px-4 text-[13px] font-medium text-white/85 transition hover:text-white"><Sparkles size={16} />Atlas AI nasıl çalışır?</a>
            </div>
            <ul aria-label="Kısa güven notları" className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/55">
              {TRUST.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-1.5"><Icon size={13} className="text-[#8fd9b2]" aria-hidden />{text}</li>
              ))}
            </ul>
          </div>
        </div>

        <a href="#kesfet" className="absolute bottom-7 left-5 hidden items-center gap-3 text-[9px] font-semibold tracking-[0.28em] text-white/60 uppercase md:flex md:left-10 lg:left-16">Aşağı kaydır <ArrowDown size={15} /></a>
        <p className="absolute right-5 bottom-7 hidden text-[9px] tracking-[0.27em] text-white/55 uppercase md:block md:right-10 lg:right-16">Her yer bir hikâye.</p>
      </section>

      <section id="kesfet" tabIndex={-1} className="bg-[#f1f0e9] outline-none px-5 py-20 text-[#102b2a] md:px-10 md:py-28 lg:px-16">
        <div className="mx-auto max-w-[1280px]">
          <p className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.28em] text-[#8f6224] uppercase"><span className="h-px w-8 bg-[#8f6224]" />Keşif noktan</p>
          <div className="mt-8 grid gap-8 md:grid-cols-[1.25fr_.75fr] md:items-end">
            <h2 className="font-display text-[clamp(48px,7vw,95px)] leading-[0.92] font-semibold tracking-[-0.06em]">Nereye gitmek<br /><span className="text-[#9c7029]">istersin?</span></h2>
            <p className="max-w-md text-[15px] leading-7 text-[#36504c] md:pb-2">Uzaklara gitmek için önce merak etmek yeter. İlham veren rotalara göz at, sana yakın gelenleri kaydet ve kendi izini haritaya bırak.</p>
          </div>

          <div className="mt-16 grid gap-px overflow-hidden border border-[#173c37]/15 bg-[#173c37]/15 md:grid-cols-3">
            {features.map(({ icon: Icon, number, title, text }) => (
              <article key={number} className="bg-[#f1f0e9] p-7 md:min-h-[310px] md:p-9">
                <div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-full border border-[#173c37]/20"><Icon size={20} strokeWidth={1.5} /></span><span className="font-mono text-[11px] text-[#8f6224]">{number}</span></div>
                <h3 className="font-display mt-12 text-[25px] font-semibold tracking-tight">{title}</h3>
                <p className="mt-4 text-[14px] leading-7 text-[#49615d]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="nasil" className="relative overflow-hidden bg-[#031b18] px-5 py-20 md:px-10 md:py-28 lg:px-16">
        <div className="absolute -top-24 -right-24 size-[420px] rounded-full bg-leaf/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.28em] text-sun uppercase">Atlas AI + Sesli Rehber</p>
            <h2 className="font-display mt-5 text-[clamp(40px,5vw,72px)] leading-[.98] font-semibold tracking-[-0.045em]">Bir haritadan<br />daha fazlası.</h2>
            <p className="mt-6 max-w-lg text-[15px] leading-7 text-mint/65">Atlasia yalnızca nereye gideceğini değil, zamanına göre hangi sırayla gezebileceğini de düşünür. Bir kültür noktasına yaklaştığında sesli anlatım sen onay verirsen başlar.</p>
            <button type="button" data-cta-level="secondary" onClick={() => onStart("how_it_works")} className="mt-8 flex min-h-[52px] items-center gap-8 border border-sun/50 px-6 text-[13px] font-semibold text-sun transition hover:bg-sun hover:text-ink">Rotanı oluşturmaya başla <ArrowRight size={15} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:translate-y-8"><Route className="text-sun" size={25} /><h3 className="mt-8 font-display text-2xl font-semibold">Zamana göre rota</h3><p className="mt-3 text-[13px] leading-6 text-mint/60">Rahat, dengeli veya yoğun tempo. Yakın duraklar ve tahmini süre tek planda.</p></div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"><Headphones className="text-leaf" size={25} /><h3 className="mt-8 font-display text-2xl font-semibold">Yerinde anlatım</h3><p className="mt-3 text-[13px] leading-6 text-mint/60">Konum izni senin kontrolünde. Ses yalnızca dinlemeyi seçtiğinde başlar.</p></div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:translate-y-8"><MapPin className="text-leaf" size={25} /><h3 className="mt-8 font-display text-2xl font-semibold">Gezgin izleri</h3><p className="mt-3 text-[13px] leading-6 text-mint/60">Kendi keşfini bırak, daha sonra İzlerim bölümünden yönet.</p></div>
            <div id="guven" className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"><ShieldCheck className="text-sun" size={25} /><h3 className="mt-8 font-display text-2xl font-semibold">Kontrol sende</h3><p className="mt-3 text-[13px] leading-6 text-mint/60">Konum, mikrofon veya ses kendiliğinden açılmaz. Her kritik işlem açık onay ister.</p></div>
          </div>
        </div>
      </section>


      {/* T6 — tanıtım filmi. `preload="none"`: video yalnız kullanıcı oynatınca
          iner (4 MB mobil veri harcamaz). Poster, hero'da zaten yüklenen marka
          görselidir (ek ağ maliyeti yok, SW kabuğunda da önbellekte).
          Otomatik oynatma ve ses yok; genişlik/yükseklik CLS için yazılı. */}
      <section id="film" aria-labelledby="film-title" className="border-t border-[#173c37]/10 bg-[#f1f0e9] px-5 py-16 text-[#102b2a] md:px-10 md:py-24 lg:px-16">
        <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-[560px]">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-[#8f6224] uppercase">Tanıtım filmi</p>
            <h2 id="film-title" className="font-display mt-4 text-[clamp(30px,4vw,52px)] leading-[1.02] font-semibold tracking-[-0.04em]">
              Bir sırt, bir sabah,<br />bir iz.
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-[#36504c]">
              Kapadokya'da Aşk Vadisi sırtı: araba yok, sadece yürüyorsun. Klip 45 saniye;
              video yalnız oynat dediğinde iner.
            </p>
            <p className="mt-3 text-[13px] leading-6 text-[#49615d]">
              Ses kapalı başlar. Otomatik oynatma yok, arka planda indirme yok.
            </p>
            <a
              href="/social/goreme-yuruyus.mp4"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 border border-[#173c37]/25 px-5 text-[13px] font-semibold transition hover:border-[#173c37] hover:bg-[#173c37] hover:text-[#f1f0e9]"
            >
              Videoyu ayrı aç
            </a>
          </div>
          <figure className="mx-auto w-full max-w-[300px] lg:mx-0">
            {/* `aria-label` yerine görünmez başlık: video öğesinin etiketi
                ekran okuyucularda tutarlı duyurulmuyor (P18 dersi). */}
            <figcaption className="sr-only">Kapadokya Aşk Vadisi yürüyüşü tanıtım filmi</figcaption>
            <video
              className="aspect-[9/16] w-full rounded-[24px] border border-[#173c37]/15 bg-[#031b18] object-cover shadow-xl"
              controls
              playsInline
              preload="none"
              poster="/images/atlasia-earth-hero.jpg"
              width={1080}
              height={1920}
            >
              <source src="/social/goreme-yuruyus.mp4" type="video/mp4" />
              Tarayıcın videoyu oynatamıyor. Klibi{" "}
              <a href="/social/goreme-yuruyus.mp4">doğrudan açabilirsin</a>.
            </video>
          </figure>
        </div>
      </section>

      {/* Alt blok (SSS + footer) `entry` dışında: ekranın altında, ilk boya
          için gerekli değil. Yükseklik fallback'i kaymayı sınırlar. */}
      <Suspense
        fallback={
          // Yer tutucu aynı zamanda `#sss` çapasıdır: mobil menüdeki "Sık
          // sorulanlar" bağlantısı, parça inerken de hedef bulur (yoksa
          // yavaş ağda tıklama sessizce hiçbir şey yapmıyordu).
          <div id="sss" aria-hidden className="min-h-[520px] bg-[#f1f0e9]" />
        }
      >
        <LandingFooter onLegal={setLegal} onStart={onStart} />
      </Suspense>

      {legal && (
        <Suspense fallback={null}>
          <LegalNotice type={legal} onClose={() => setLegal(null)} />
        </Suspense>
      )}
    </main>
    </>
  );
}
