// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsContentProps } from "./SettingsPanel";

const h = vi.hoisted(() => ({
  user: {
    uid: "u-test-1",
    displayName: "Efe Gezgin",
    email: "efe@atlasia.example",
    emailVerified: true,
    backend: "firebase" as "firebase" | "device",
  },
  logout: vi.fn(async () => undefined),
  setName: vi.fn(async (_name: string) => undefined),
  resendVerification: vi.fn(async () => undefined),
  refreshSession: vi.fn(async () => null),
  deleteAccount: vi.fn(async (_args: { uid: string; backend: string; password?: string }) => undefined),
  exportAccountData: vi.fn(async () => ({ filename: "atlasia-export.json", json: '{"ok":true}' })),
  downloadAccountExport: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: h.user,
    logout: h.logout,
    setName: h.setName,
    resendVerification: h.resendVerification,
    refreshSession: h.refreshSession,
  }),
}));

vi.mock("../hooks/useCollections", () => ({
  useCollections: () => ({
    savedPlaces: [{ id: "p1" }],
    savedRoutes: [{ id: "r1" }, { id: "r2" }],
  }),
}));

vi.mock("../lib/moderation", () => ({
  deleteAccount: h.deleteAccount,
}));

vi.mock("../lib/accountExport", () => ({
  exportAccountData: h.exportAccountData,
  downloadAccountExport: h.downloadAccountExport,
}));

vi.mock("./SettingsPanel", () => ({
  SettingsContent: () => createElement("div", { "data-testid": "settings-stub" }, "Ayarlar özeti"),
}));

import ProfilePanel from "./ProfilePanel";

const stubSettings = {} as unknown as SettingsContentProps;

beforeEach(() => {
  h.logout.mockReset().mockResolvedValue(undefined);
  h.setName.mockReset().mockResolvedValue(undefined);
  h.deleteAccount.mockReset().mockResolvedValue(undefined);
  h.exportAccountData.mockReset().mockResolvedValue({ filename: "atlasia-export.json", json: '{"ok":true}' });
  h.downloadAccountExport.mockReset();
  h.user = {
    uid: "u-test-1",
    displayName: "Efe Gezgin",
    email: "efe@atlasia.example",
    emailVerified: true,
    backend: "firebase",
  };
});

afterEach(() => {
  cleanup();
});

function renderProfile(onClose = vi.fn()) {
  return render(
    createElement(ProfilePanel, {
      onClose,
      onRecords: () => {},
      settings: stubSettings,
      myPlacesCount: 3,
      onMyPlaces: () => {},
      unreadCount: 2,
      onNotifications: () => {},
      onAtlasAI: () => {},
    }),
  );
}

describe("ProfilePanel (M-35 · hesap silme, veri dışa aktarma ve çıkış akışları)", () => {
  it("geri alınamaz hesap silmede çift onay ister; Vazgeç silmez, onay şifreyi iletir", async () => {
    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Hesabımı ve verilerimi sil/i }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(h.deleteAccount).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Hesabımı ve verilerimi sil/i }));
    const passwordInput = screen.getByLabelText(/Şifren/i);
    fireEvent.change(passwordInput, { target: { value: "GizliSifre!42" } });
    fireEvent.click(screen.getByRole("button", { name: /Evet, sil/i }));

    await waitFor(() => {
      expect(h.deleteAccount).toHaveBeenCalledWith({
        uid: "u-test-1",
        backend: "firebase",
        password: "GizliSifre!42",
      });
    });
    expect(await screen.findByRole("status")).toBeTruthy();
  });

  it("hesap silme başarısız olursa diyaloğu kapatmaz ve hatayı gösterir", async () => {
    h.deleteAccount.mockRejectedValueOnce(new Error("Yeniden doğrulama başarısız."));
    const onClose = vi.fn();
    renderProfile(onClose);

    fireEvent.click(screen.getByRole("button", { name: /Hesabımı ve verilerimi sil/i }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, sil/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Yeniden doğrulama başarısız");
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("KVKK md. 11 veri indirme akışı JSON dışa aktarımını tetikler ve hata durumunda kısmi dosya indirmez", async () => {
    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Verilerimi indir/i }));
    await waitFor(() => {
      expect(h.exportAccountData).toHaveBeenCalledWith({
        uid: "u-test-1",
        backend: "firebase",
        account: { displayName: "Efe Gezgin", email: "efe@atlasia.example" },
      });
    });
    expect(h.downloadAccountExport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain("Verilerin JSON dosyası hazırlandı.");

    h.exportAccountData.mockRejectedValueOnce(new Error("Kota sınırına ulaşıldı"));
    fireEvent.click(screen.getByRole("button", { name: /Verilerimi indir/i }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain("Veriler indirilemedi: Kota sınırına ulaşıldı");
    });
    expect(h.downloadAccountExport).toHaveBeenCalledTimes(1);
  });

  it("oturum kapatmada onay sorar; Vazgeç çıkışı iptal eder, Çıkış yap logout çağırır", async () => {
    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Hesaptan çık/i }));
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(h.logout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Hesaptan çık/i }));
    fireEvent.click(screen.getByRole("button", { name: /Çıkış yap/i }));
    await waitFor(() => {
      expect(h.logout).toHaveBeenCalledTimes(1);
    });
  });
});
