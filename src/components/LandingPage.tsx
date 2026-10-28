import {
  ArrowDown,
  ArrowRight,
  Compass,
  Headphones,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface Props {
  onStart: () => void;
}

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
  return (
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
            <a href="#kesfet" className="transition hover:text-white">Keşfet</a>
            <a href="#nasil" className="transition hover:text-white">Nasıl çalışır?</a>
            <a href="#guven" className="transition hover:text-white">Gizlilik</a>
          </nav>
          <button type="button" onClick={onStart} className="group flex min-h-11 items-center gap-3 border border-white/35 bg-black/15 px-4 text-[12px] font-semibold backdrop-blur-sm transition hover:border-sun hover:bg-sun hover:text-[#15221d] md:px-6">
            Keşfe başla <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </button>
        </header>

        <div id="top" className="mx-auto flex min-h-[calc(100dvh-82px)] w-full max-w-[1440px] items-end px-5 pt-24 pb-20 md:min-h-[calc(100dvh-92px)] md:items-center md:px-10 md:pt-16 md:pb-24 lg:px-16">
          <div className="max-w-[700px]">
            <p className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.32em] text-[#f3c870] uppercase md:text-[12px]"><span className="h-px w-8 bg-[#f3c870]" />Dünya seni bekliyor</p>
            <h1 className="font-display mt-7 text-[clamp(68px,11vw,160px)] leading-[0.78] font-semibold tracking-[-0.075em] text-white">atlasia<span className="text-sun">.</span></h1>
            <h2 className="font-display mt-7 max-w-[690px] text-[clamp(29px,4vw,55px)] leading-[1.02] font-medium tracking-[-0.045em]">Dünyayı <span className="text-[#f3c870]">merakınla</span> keşfet.</h2>
            <p className="mt-6 max-w-[500px] text-[14px] leading-7 text-white/70 md:text-[16px]">Yeni yerler, gerçek gezgin izleri ve bulunduğun noktada canlanan hikâyeler. Bir sonraki keşfin burada başlıyor.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" onClick={onStart} className="group flex min-h-[56px] items-center gap-8 bg-[#f3c870] px-6 text-[13px] font-bold text-[#142019] transition hover:bg-white md:px-7">Dünyayı keşfet <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></button>
              <a href="#nasil" className="flex min-h-[56px] items-center gap-2 px-4 text-[13px] font-medium text-white/85 transition hover:text-white"><Sparkles size={16} />Atlas AI nasıl çalışır?</a>
            </div>
          </div>
        </div>

        <a href="#kesfet" className="absolute bottom-7 left-5 hidden items-center gap-3 text-[9px] font-semibold tracking-[0.28em] text-white/60 uppercase md:flex md:left-10 lg:left-16">Aşağı kaydır <ArrowDown size={15} /></a>
        <p className="absolute right-5 bottom-7 hidden text-[9px] tracking-[0.27em] text-white/55 uppercase md:block md:right-10 lg:right-16">Her yer bir hikâye.</p>
      </section>

      <section id="kesfet" className="bg-[#f1f0e9] px-5 py-20 text-[#102b2a] md:px-10 md:py-28 lg:px-16">
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
            <button type="button" onClick={onStart} className="mt-8 flex min-h-[52px] items-center gap-8 border border-sun/50 px-6 text-[13px] font-semibold text-sun transition hover:bg-sun hover:text-ink">Rotanı oluşturmaya başla <ArrowRight size={15} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:translate-y-8"><Route className="text-sun" size={25} /><h3 className="mt-8 font-display text-2xl font-semibold">Zamana göre rota</h3><p className="mt-3 text-[13px] leading-6 text-mint/60">Rahat, dengeli veya yoğun tempo. Yakın duraklar ve tahmini süre tek planda.</p></div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"><Headphones className="text-leaf" size={25} /><h3 className="mt-8 font-display text-2xl font-semibold">Yerinde anlatım</h3><p className="mt-3 text-[13px] leading-6 text-mint/60">Konum izni senin kontrolünde. Ses yalnızca dinlemeyi seçtiğinde başlar.</p></div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:translate-y-8"><MapPin className="text-leaf" size={25} /><h3 className="mt-8 font-display text-2xl font-semibold">Gezgin izleri</h3><p className="mt-3 text-[13px] leading-6 text-mint/60">Kendi keşfini bırak, daha sonra İzlerim bölümünden yönet.</p></div>
            <div id="guven" className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"><ShieldCheck className="text-sun" size={25} /><h3 className="mt-8 font-display text-2xl font-semibold">Kontrol sende</h3><p className="mt-3 text-[13px] leading-6 text-mint/60">Konum, mikrofon veya ses kendiliğinden açılmaz. Her kritik işlem açık onay ister.</p></div>
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-5 border-t border-white/10 bg-[#020f0d] px-5 py-8 text-[11px] text-mint/45 md:flex-row md:items-center md:justify-between md:px-10 lg:px-16">
        <p className="font-display text-lg font-semibold text-mint">atlasia<span className="text-sun">.</span></p>
        <p>© {new Date().getFullYear()} Atlasia · Merak ettiğin her yer</p>
        <button type="button" onClick={onStart} className="flex items-center gap-2 text-sun">Keşfe başla <ArrowRight size={13} /></button>
      </footer>
    </main>
  );
}
