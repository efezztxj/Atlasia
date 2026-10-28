import { Component, Suspense, lazy, useEffect, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { COOKIE_PREFERENCES_EVENT } from "../lib/cookieConsent";

interface Props {
  children?: ReactNode;
  load: () => Promise<{ default: ComponentType }>;
}

interface State {
  failed: boolean;
  RetryView: ComponentType | null;
}

/**
 * T7/T18 dayanıklılık sınırı: `CookieConsent` tembel parçası kesintili ağda
 * indirilemezse hatanın `AppErrorBoundary`'ye tırmanıp tüm uygulamayı
 * düşürmesini engeller; "Tekrar dene" veya footer'daki "Çerez tercihleri"
 * tetiklendiğinde taze bir `lazy()` fabrikasıyla parçayı yeniden ister.
 */
export default class CookieConsentBoundary extends Component<Props, State> {
  state: State = { failed: false, RetryView: null };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true, RetryView: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[Atlasia] Çerez tercihleri parçası indirilemedi:", error, info.componentStack);
  }

  componentDidMount() {
    window.addEventListener(COOKIE_PREFERENCES_EVENT, this.handlePreferencesRequest);
  }

  componentWillUnmount() {
    window.removeEventListener(COOKIE_PREFERENCES_EVENT, this.handlePreferencesRequest);
  }

  private handlePreferencesRequest = () => {
    if (this.state.failed) {
      this.retry(true);
    }
  };

  private retry = (reopenPreferences = false) => {
    const RetryView = lazy(async () => {
      const mod = await this.props.load();
      if (!reopenPreferences) return mod;
      const Loaded = mod.default;
      return {
        default: function ReopenedCookieConsent() {
          useEffect(() => {
            window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT));
          }, []);
          return <Loaded />;
        },
      };
    });
    this.setState({ failed: false, RetryView });
  };

  render() {
    if (this.state.failed) {
      return (
        <div
          role="alert"
          className="fixed right-4 bottom-4 z-[90] flex items-center gap-2 rounded-full border border-sun/30 bg-ink/90 px-4 py-2 text-[12px] text-mint shadow-xl"
        >
          <span>Çerez tercihleri yüklenemedi</span>
          <button
            type="button"
            onClick={() => this.retry(true)}
            className="rounded-full bg-sun px-3 py-1 text-[12px] font-semibold text-ink"
          >
            Tekrar dene
          </button>
        </div>
      );
    }
    const { RetryView } = this.state;
    if (RetryView) {
      return (
        <Suspense fallback={null}>
          <RetryView />
        </Suspense>
      );
    }
    return this.props.children;
  }
}
