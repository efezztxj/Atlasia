import { Component, type ErrorInfo, type ReactNode } from "react";
import { Compass, RefreshCcw, TriangleAlert } from "lucide-react";
import { getTelemetry } from "../lib/telemetry";

interface Props { children: ReactNode; }
interface State { failed: boolean; }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Atlasia] Beklenmeyen arayüz hatası:", error, info.componentStack);
    // Ölçüm: bileşen yığını gönderilmez (PII taşıyabilir), yalnız sınır adı.
    getTelemetry().captureError(error, { source: "AppErrorBoundary", boundary: "root" });
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="grid min-h-dvh place-items-center bg-[#020f0d] px-5 text-[#e4f5ea]">
        <section className="w-full max-w-[480px] rounded-[30px] border border-white/10 bg-[#06221b] p-7 text-center shadow-2xl shadow-black/60">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#eab54f]/10 text-[#eab54f]"><TriangleAlert size={24} /></span>
          <p className="mt-5 flex items-center justify-center gap-2 font-display text-2xl font-semibold"><Compass size={21} />Atlasia<span className="-ml-2 text-[#eab54f]">.</span></p>
          <h1 className="mt-5 font-display text-2xl font-semibold">Harita bu kez yüklenemedi</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-[#e4f5ea]/65">Verilerin korunuyor. Güncel sürümü yeniden yükleyerek kaldığın yerden devam edebilirsin.</p>
          <button type="button" onClick={this.reload} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#eab54f] px-5 text-[14px] font-bold text-[#10241a]"><RefreshCcw size={16} />Yeniden yükle</button>
          <a href="/" className="mt-3 flex min-h-11 items-center justify-center text-[13px] text-[#5be0a6]">Başlangıç sayfasına dön</a>
        </section>
      </main>
    );
  }
}
