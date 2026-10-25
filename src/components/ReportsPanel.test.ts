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
  bans: [],
  onBan: vi.fn(async () => {}),
  onWarn: vi.fn(async () => {}),
  onTakedown: vi.fn(async () => {}),
  appeals: [],
  onResolveAppeal: vi.fn(async () => {}),
  modActions: [],
  announcements: [],
  onCreateAnnouncement: vi.fn(async () => {}),
  onDeleteAnnouncement: vi.fn(async () => {}),
  onFetchHistory: vi.fn(async () => ({ reports: [], warningCount: 0, ban: null })),
  onLiftBan: vi.fn(async () => {}),
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

describe("ReportsPanel · askıya alma akışı", () => {
  afterEach(() => cleanup());

  const actioned = () => report({ status: "actioned", targetOwnerUid: "spammer" });

  it("ban ancak 'İşlem yapıldı' işaretli raporda önerilir (kural kapısı)", () => {
    renderPanel({ moderator: true, queue: [report({ targetOwnerUid: "spammer" })] });
    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    expect(screen.queryByRole("button", { name: /Hesabı askıya al/ })).toBeNull();
    expect(screen.getByText(/önce raporu “İşlem yapıldı” olarak işaretle/)).toBeTruthy();
  });

  it("süre ve gerekçeyle askıya alır", async () => {
    const onBan = vi.fn(async () => {});
    renderPanel({ moderator: true, queue: [actioned()], onBan });

    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    fireEvent.click(screen.getByRole("button", { name: /Hesabı askıya al/ }));
    expect((screen.getByRole("button", { name: "Askıya al" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Süre/), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText(/Gerekçe/), { target: { value: "Tekrarlanan spam ve hakaret." } });
    fireEvent.click(screen.getByRole("button", { name: "Askıya al" }));

    await waitFor(() => expect(onBan).toHaveBeenCalledWith(expect.objectContaining({ id: "report-1" }), 7, "Tekrarlanan spam ve hakaret."));
  });

  it("kısa gerekçede göndermez", () => {
    renderPanel({ moderator: true, queue: [actioned()], onBan: vi.fn(async () => {}) });
    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    fireEvent.click(screen.getByRole("button", { name: /Hesabı askıya al/ }));
    fireEvent.change(screen.getByLabelText(/Gerekçe/), { target: { value: "spam" } });
    expect((screen.getByRole("button", { name: "Askıya al" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("etkin banı gösterir ve kaldırır", async () => {
    const onLiftBan = vi.fn(async () => {});
    renderPanel({
      moderator: true,
      queue: [actioned()],
      onLiftBan,
      bans: [{ uid: "spammer", reason: "Spam", reportId: "r", createdAt: Date.now(), createdBy: "mod-1" }],
    });
    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    expect(screen.getByText(/Askıda: kalıcı/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Banı kaldır/ }));
    await waitFor(() => expect(onLiftBan).toHaveBeenCalledWith("spammer"));
  });

  it("kendi hesabı için askıya alma düğmesi göstermez", () => {
    renderPanel({ moderator: true, uid: "spammer", queue: [actioned()] });
    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    expect(screen.queryByRole("button", { name: /Hesabı askıya al/ })).toBeNull();
  });
});

describe("ReportsPanel · kademeli yaptırım ve ayrıcalıklı görünümler", () => {
  afterEach(() => cleanup());

  const reviewed = () => report({ status: "reviewed", targetOwnerUid: "spammer" });

  it("uyarı ancak incelenmiş raporda açılır; kısa gerekçeyle gönderilmez", async () => {
    const onWarn = vi.fn(async () => {});
    renderPanel({ moderator: true, queue: [reviewed()], onWarn });
    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    fireEvent.click(screen.getByRole("button", { name: /Uyarı gönder/ }));
    const send = screen.getByRole("button", { name: "Uyarıyı gönder" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Uyarı gerekçesi/), { target: { value: "Küfürlü yorumların tekrarı." } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    await waitFor(() => expect(onWarn).toHaveBeenCalledWith(expect.objectContaining({ id: "report-1" }), "Küfürlü yorumların tekrarı."));
  });

  it("açık raporda uyarı kapısı kapalıdır", () => {
    renderPanel({ moderator: true, queue: [report({ targetOwnerUid: "spammer" })] });
    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    expect(screen.queryByRole("button", { name: /Uyarı gönder/ })).toBeNull();
    expect(screen.getByText(/Uyarı için önce raporu/)).toBeTruthy();
  });

  it("içerik kaldırma iki aşamalı onay ister ve kalıcı silmeyi çağırır", async () => {
    const onTakedown = vi.fn(async () => {});
    renderPanel({ moderator: true, queue: [reviewed()], onTakedown });
    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    fireEvent.click(screen.getByRole("button", { name: /İçeriği kalıcı sil/ }));
    expect(screen.getByText(/kalıcı olarak silinecek/)).toBeTruthy();
    expect(onTakedown).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Kalıcı sil" }));
    await waitFor(() => expect(onTakedown).toHaveBeenCalledWith(expect.objectContaining({ targetId: "post-1" })));
  });

  it("kullanıcı hedefinde içerik silme sunulmaz", () => {
    renderPanel({ moderator: true, queue: [report({ status: "reviewed", targetType: "user", targetId: "spammer" })] });
    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    expect(screen.queryByRole("button", { name: /İçeriği kalıcı sil/ })).toBeNull();
  });

  it("kuyruk durum süzgeci ve arama çalışır", () => {
    renderPanel({
      moderator: true,
      queue: [
        report({ id: "r-open", status: "open", details: "Açık olan" }),
        report({ id: "r-done", status: "actioned", targetOwnerUid: "spammer", details: "Bitmiş olan" }),
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    expect(screen.getByText(/Açık olan/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Duruma göre süz"), { target: { value: "actioned" } });
    expect(screen.queryByText(/Açık olan/)).toBeNull();
    expect(screen.getByText(/Bitmiş olan/)).toBeTruthy();
  });

  it("hedef geçmişi kartta gösterilir", async () => {
    const onFetchHistory = vi.fn(async () => ({ reports: [report(), report({ id: "r2" })], warningCount: 3, ban: null }));
    renderPanel({ moderator: true, queue: [reviewed()], onFetchHistory });
    fireEvent.click(screen.getByRole("button", { name: /Kuyruk/ }));
    fireEvent.click(screen.getByRole("button", { name: /Geçmiş/ }));
    await waitFor(() => expect(screen.getByText(/aleyhinde/)).toBeTruthy());
    expect(screen.getByText(/Ban kaydı yok/)).toBeTruthy();
    expect(onFetchHistory).toHaveBeenCalledWith("spammer");
  });

  it("itirazlar sekmesi: karar yazar, etkin bansa kaldırma sunar", async () => {
    const onResolveAppeal = vi.fn(async () => {});
    const onLiftBan = vi.fn(async () => {});
    renderPanel({
      moderator: true,
      onResolveAppeal,
      onLiftBan,
      bans: [{ uid: "spammer", reason: "Spam", reportId: "r", createdAt: Date.now(), createdBy: "mod-1" }],
      appeals: [{ id: "ap1", uid: "spammer", message: "Yanlış anlaşılma oldu.", createdAt: Date.now(), status: "open" }],
    });
    fireEvent.click(screen.getByRole("button", { name: /İtirazlar/ }));
    expect(screen.getByText(/Yanlış anlaşılma/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kabul et" }));
    await waitFor(() => expect(onResolveAppeal).toHaveBeenCalledWith("ap1", "accepted"));
    fireEvent.click(screen.getByRole("button", { name: /Banı kaldır/ }));
    await waitFor(() => expect(onLiftBan).toHaveBeenCalledWith("spammer"));
  });

  it("duyuru sekmesi yayınlar ve siler", async () => {
    const onCreateAnnouncement = vi.fn(async () => {});
    const onDeleteAnnouncement = vi.fn(async () => {});
    renderPanel({
      moderator: true,
      onCreateAnnouncement,
      onDeleteAnnouncement,
      announcements: [{ id: "ann1", title: "Eski duyuru", body: "Gövde metni", createdBy: "mod-1", createdAt: Date.now() }],
    });
    fireEvent.click(screen.getByRole("button", { name: /Duyurular/ }));
    fireEvent.change(screen.getByLabelText("Başlık"), { target: { value: "Bakım" } });
    fireEvent.change(screen.getByLabelText("Metin"), { target: { value: "Bu gece kısa bakım var." } });
    fireEvent.click(screen.getByRole("button", { name: "Yayınla" }));
    await waitFor(() => expect(onCreateAnnouncement).toHaveBeenCalledWith("Bakım", "Bu gece kısa bakım var."));
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    await waitFor(() => expect(onDeleteAnnouncement).toHaveBeenCalledWith("ann1"));
  });

  it("işlem kaydı sekmesi günlüğü listeler", () => {
    renderPanel({
      moderator: true,
      modActions: [{ id: "m1", actorUid: "mod-1", action: "ban", targetOwnerUid: "spammer", detail: "Spam", createdAt: Date.now() }],
    });
    fireEvent.click(screen.getByRole("button", { name: /Kayıtlar/ }));
    expect(screen.getByText("Askıya alma")).toBeTruthy();
    expect(screen.getByText("Spam")).toBeTruthy();
  });
});
