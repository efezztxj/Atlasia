// @vitest-environment jsdom
/**
 * T9 — giriş/kayıt ekranı sürtünmesi kilidi.
 *
 * Kurallar (plan T9):
 *  1. Önce Google/Apple; e-posta "veya" ayırıcısının altında.
 *  2. Çalışmayan sağlayıcı gösterilmez: "Apple ile giriş yakında" diye devre dışı
 *     düğme yok; Apple kapalıyken e-posta formunda mikro metin var.
 *  3. Şifre göster/gizle ve doğru `autocomplete` değerleri korunur; hatalar alan
 *     bazlı ve satır içi.
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  authConfigured: true,
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    backend: "firebase",
    checking: false,
    error: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    setName: vi.fn(),
    refreshSession: vi.fn(),
    resendVerification: vi.fn(),
  }),
}));

vi.mock("../lib/auth", () => ({
  get authConfigured() {
    return authState.authConfigured;
  },
  authErrorMessage: () => "hata",
  getAtlasAuth: vi.fn(),
  requestPasswordReset: vi.fn(),
  signInSocial: vi.fn(),
}));

const AccountAccess = (await import("./AccountAccess")).default;

afterEach(() => cleanup());

function emailInput() {
  return screen.getByLabelText("E-posta adresi") as HTMLInputElement;
}

function formOrder(): number {
  const google = screen.getByRole("button", { name: /Google ile devam et/i });
  const input = emailInput();
  // DOCUMENT_POSITION_FOLLOWING = 4 → giriş alanı Google düğmesinden SONRA geliyor.
  return google.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING;
}

describe("giriş ekranı — sağlayıcı sırası", () => {
  it("Google formun üstünde; e-posta 'veya e-posta ile' altında", () => {
    authState.authConfigured = true;
    render(createElement(AccountAccess));

    expect(formOrder()).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // Ayırıcı metni iki <span> arasında bölünür; metin düğümü olarak aranır.
    expect(screen.getAllByText(/veya e-posta ile/i).length).toBeGreaterThan(0);
  });

  it("Apple kapalıyken ne devre dışı düğme ne de 'yakında' vaadi var", () => {
    authState.authConfigured = true;
    render(createElement(AccountAccess));

    expect(screen.queryByRole("button", { name: /Apple/i })).toBeNull();
    // D5: ölü düğme kaldırılmıştı ama "yakında" metni kalmıştı; olmayan bir
    // özelliği vaat ediyordu. Artık hiçbir iz yok.
    expect(screen.queryByText(/Apple/i)).toBeNull();
    // Hiçbir sosyal düğme devre dışı gösterilmiyor.
    for (const name of [/Google ile devam et/i]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it("yapılandırma yokken (cihaz hesabı) sosyal düğme ve ayırıcı gösterilmez, neden açıklanır", () => {
    authState.authConfigured = false;
    render(createElement(AccountAccess));

    expect(screen.queryByRole("button", { name: /Google/i })).toBeNull();
    expect(screen.queryAllByText(/veya e-posta ile/i)).toHaveLength(0);
    // Not metni Apple bayrağına göre iki biçimde gelir ("Google ve Apple…" /
    // "Google…"); iki dalda da ortak olan kısım: neden gösterilmediği yazılı.
    expect(screen.getByText(/bağlantısı henüz etkin değil/i)).toBeTruthy();
    expect(emailInput()).toBeTruthy();
  });
});

describe("T4 — misafirden gelen kullanıcı geri dönebilir", () => {
  it("onClose verilirse 'Misafir olarak devam et' düğmesi ekranı kapatır", async () => {
    authState.authConfigured = true;
    const onClose = vi.fn();
    render(createElement(AccountAccess, { onClose }));

    const back = screen.getByRole("button", { name: /Misafir olarak devam et/i });
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(back);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("onClose yoksa geri dönüş düğmesi çizilmez (kayıt duvarı akışı bozulmaz)", () => {
    authState.authConfigured = true;
    render(createElement(AccountAccess));
    expect(screen.queryByRole("button", { name: /Misafir olarak devam et/i })).toBeNull();
  });
});

describe("giriş ekranı — form alanları", () => {
  it("e-posta ve şifre alanları doğru autocomplete değerlerini taşır", () => {
    authState.authConfigured = true;
    render(createElement(AccountAccess));

    expect(emailInput().getAttribute("autocomplete")).toBe("email");
    const password = screen.getByLabelText("Şifre") as HTMLInputElement;
    expect(password.getAttribute("autocomplete")).toBe("current-password");
    expect(password.type).toBe("password");
  });

  it("şifre göster/gizle düğmesi var ve tıklanınca alan tipi değişiyor", async () => {
    authState.authConfigured = true;
    const { fireEvent } = await import("@testing-library/react");
    render(createElement(AccountAccess));

    const password = screen.getByLabelText("Şifre") as HTMLInputElement;
    const toggle = screen.getByRole("button", { name: /şifreyi göster/i });
    fireEvent.click(toggle);
    expect(password.type).toBe("text");
  });
});

describe("kayıt ekranı — kaynak düzeyi kilit", () => {
  const source = readFileSync("src/components/AccountAccess.tsx", "utf8");

  it("devre dışı Apple düğmesi ve küçültücü sınıf geri gelmiyor", () => {
    expect(source).not.toContain("auth-secondary-providers");
    expect(source).not.toContain('!APPLE_AUTH_ENABLED} title=');
    // Apple yalnız etkinse üretiliyor.
    expect(source).toMatch(/authConfigured && APPLE_AUTH_ENABLED \? <button/);
  });

  it("sağlayıcılar credentials ekranında formun önünde tanımlanır", () => {
    const idxProviders = source.indexOf('const providers = socialButtons.length');
    const idxForm = source.indexOf('className="auth-email-form"');
    expect(idxProviders).toBeGreaterThan(0);
    expect(idxForm).toBeGreaterThan(idxProviders);
    expect(source).toContain('{providers && <>{providers}<div className="auth-separator"><span />veya e-posta ile<span /></div></>}');
  });
});
