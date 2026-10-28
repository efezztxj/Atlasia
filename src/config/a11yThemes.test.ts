// @vitest-environment jsdom
/**
 * C3 — erişilebilirlik kapısı: **üç tema × kritik ekranlar**.
 *
 * NEDEN AYRI DOSYA: `components/a11y.test.ts` iki ekranı tek temada (açık)
 * denetliyordu. Denetimde istenen kapsam üç tema (light / dark / midnight) ×
 * kritik yüzeyler. Temaya bağlı koşullu işaretleme (ör. yalnız koyu temada
 * çizilen bir düğme) tek temada kaçabiliyor.
 *
 * SINIR — DÜRÜST NOT: axe'in `color-contrast` kuralı jsdom'da hesaplanamaz
 * (layout yok), burada kapalı. Kontrast ayrı kapılarda ölçülüyor:
 * `config/landingContrast.test.ts`, `config/accessibility.test.ts` (token
 * matematiği) ve canlı Lighthouse. Bu dosya ad/rol/değer ve yapı hatalarını
 * üç temada tarar.
 */
import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ collections: { loading: false, error: null as string | null } }));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    backend: "device",
    user: null,
    checking: false,
    error: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));
vi.mock("../lib/auth", () => ({
  authConfigured: false,
  authErrorMessage: (error: unknown) => String(error),
  getAtlasAuth: vi.fn(),
  requestPasswordReset: vi.fn(),
  signInSocial: vi.fn(),
}));
vi.mock("../lib/passwordSecurity", () => ({
  checkPwnedPassword: vi.fn(async () => ({ status: "unavailable" })),
  estimatePasswordStrength: () => ({ score: 0, label: "" }),
}));
vi.mock("../lib/deviceAccounts", () => ({ resetDevicePassword: vi.fn() }));
vi.mock("../hooks/useCollections", () => ({
  useCollections: () => ({
    savedPlaces: [],
    savedRoutes: [],
    savePlace: vi.fn(),
    saveRoute: vi.fn(),
    removeRoute: vi.fn(),
    loading: h.collections.loading,
    error: h.collections.error,
  }),
  isCloudAccount: () => false,
}));
vi.mock("../lib/routeData", () => ({
  PUBLIC_ROUTE_PAGE_SIZE: 12,
  listPublicRoutes: vi.fn(async () => []),
  listOwnedTracks: vi.fn(async () => []),
  filterPublicRoutes: (routes: unknown[]) => routes,
  sortPublicRoutes: (routes: unknown[]) => routes,
  deleteTrack: vi.fn(async () => {}),
}));
vi.mock("../lib/firebase", () => ({ firebaseConfigured: false, isCloudReady: false, db: {}, firebaseApp: {} }));
vi.mock("../lib/firebaseConfig", () => ({ firebaseConfigured: false, isCloudReady: false }));

import AccountAccess from "../components/AccountAccess";
import CookieConsent from "../components/CookieConsent";
import DataStatusBanner from "../components/DataStatusBanner";
import FeedbackDialog from "../components/FeedbackDialog";
import LandingPage from "../components/LandingPage";
import LegalNotice from "../components/LegalNotice";
import RecordsDock from "../components/RecordsDock";

/** Tema `document.documentElement.dataset.theme` ile uygulanır (useTheme). */
const THEMES = ["light", "dark", "midnight"] as const;

const SCREENS = [
  { name: "tanıtım", element: () => createElement(LandingPage, { onStart: () => {} }) },
  { name: "giriş", element: () => createElement(AccountAccess) },
  { name: "kayıtlar", element: () => createElement(RecordsDock, { onClose: () => {}, onPlace: () => {}, onRoute: () => {} }) },
  { name: "geri bildirim", element: () => createElement(FeedbackDialog, { uid: "u1", onClose: () => {} }) },
  { name: "gizlilik metni", element: () => createElement(LegalNotice, { type: "privacy", onClose: () => {} }) },
  { name: "çerez bandı", element: () => createElement(CookieConsent) },
  {
    name: "veri hatası şeridi",
    element: () => createElement(DataStatusBanner, { kind: "remote", onRetry: () => {}, onDismiss: () => {} }),
  },
] as const;

async function violationsOf(element: HTMLElement): Promise<string[]> {
  const results = await axe.run(element, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.map((violation) =>
    `${violation.id} (${violation.nodes.length}) — ${violation.nodes.map((node) => node.html).join(" | ")}`);
}

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
  h.collections.loading = false;
  h.collections.error = null;
});

describe("C3 · üç tema × kritik ekranlar", () => {
  for (const theme of THEMES) {
    for (const screen of SCREENS) {
      it(`${theme} · ${screen.name}: axe ihlali yok`, async () => {
        document.documentElement.dataset.theme = theme;
        const { container } = render(screen.element());
        expect(await violationsOf(container)).toEqual([]);
      });
    }
  }

  it("kapsam gerçekten üç tema ve yedi ekran (kapı daralmasın)", () => {
    expect(THEMES).toHaveLength(3);
    expect(SCREENS.length).toBeGreaterThanOrEqual(7);
  });

  it("her ekranda en az bir odaklanabilir öğe var (boş render'a karşı)", () => {
    for (const screen of SCREENS) {
      const { container, unmount } = render(screen.element());
      const focusable = container.querySelectorAll("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])");
      expect(focusable.length, `${screen.name} boş render edilmiş olabilir`).toBeGreaterThan(0);
      unmount();
    }
  });
});
