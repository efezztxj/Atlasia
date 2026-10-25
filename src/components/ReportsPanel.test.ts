// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Report } from "../lib/moderation";
import ReportsPanel from "./ReportsPanel";

/**
 * Denetim K-07 / AY-03: moderasyon arayüzü.
 * - Raporlarım: kullanıcı kendi raporlarının durumunu görür.
 * - Kuyruk sekmesi yalnız `moderator` doğruyken görünür (fail-closed kapı).
 * - Durum yazımı yalnız izinli düğmelerle ve moderatör notuyla yapılır.
 */
const report = (overrides: Partial<Report> = {}): Report => ({
  id: "report-1",
  reporterUid: "u1",
  targetType: "post",
  targetId: "post-1",
  reason: "spam",
  details: "Tekrarlanan reklam bağlantısı.",
  createdAt: Date.now() - 60_000,
  status: "open",
  ...overrides,
});

type PanelProps = Parameters<typeof ReportsPanel>[0];

const baseProps: PanelProps = {
  open: true,
  onClose: () => {},
  uid: "u1",
  moderator: false,
  myReports: [report()],
  myReportsError: null,
  queue: [] as Report[],
  queueLoading: false,
  queueError: null,
  onStatus: vi.fn(async () => {}),
};

const renderPanel = (overrides: Partial<PanelProps> = {}) =>
  render(createElement(ReportsPanel, { ...baseProps, ...overrides }));

describe("ReportsPanel", () => {
  afterEach(() => cleanup());

  it("kendi raporunu Türkçe etiket ve durumla gösterir", () => {
    renderPanel();
    expect(screen.getByText(/Gönderi · Spam \/ reklam/)).toBeTruthy();
    expect(screen.getByText("İnceleniyor")).toBeTruthy();
    expect(screen.getByText(/Tekrarlanan reklam/)).toBeTruthy();
  });

  it("moderatör değilse kuyruk sekmesi ve kuyruk eylemleri yok", () => {
    renderPanel();
    expect(screen.queryByRole("button", { name: /Kuyruk/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /İşlem yapıldı/ })).toBeNull();
  });

  it("moderatör kuyruğu görür, durum yazar ve not bırakır", async () => {
    const onStatus = vi.fn(async () => {});
    renderPanel({ moderator: true, queue: [report()], onStatus });

    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    expect(screen.getByRole("button", { name: /İşlem yapıldı/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /İşlem yapıldı/ }));
    await waitFor(() => expect(onStatus).toHaveBeenCalledWith("report-1", "actioned", undefined));

    fireEvent.click(screen.getByRole("button", { name: /Not/ }));
    fireEvent.change(screen.getByLabelText(/Moderatör notu/), { target: { value: "İçerik kaldırıldı." } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onStatus).toHaveBeenCalledWith("report-1", "reviewed", "İçerik kaldırıldı."));
  });

  it("durum yazımı hata verirse kullanıcıya gösterir", async () => {
    const onStatus = vi.fn(async () => { throw new Error("Yetki yok."); });
    renderPanel({ moderator: true, queue: [report()], onStatus });

    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    fireEvent.click(screen.getByRole("button", { name: /İşlem yapıldı/ }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Yetki yok."));
  });

  it("kuyruk hatasını gösterir, boş kuyrukta dürüst mesaj verir", () => {
    renderPanel({ moderator: true, queue: [], queueError: "Kurallar dağıtılmadı." });
    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    expect(screen.getByRole("alert").textContent).toContain("Kurallar dağıtılmadı.");
  });
});
