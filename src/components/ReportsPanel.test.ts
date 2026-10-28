// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Announcement, Appeal, Ban, ModAction, Report, TargetHistory } from "../lib/moderation";
import ReportsPanel from "./ReportsPanel";

afterEach(cleanup);

function report(overrides: Partial<Report> = {}): Report {
  return {
    id: "rp-test001",
    reporterUid: "alice",
    targetType: "post",
    targetId: "post-42",
    reason: "spam",
    details: "Tekrarlayan reklam bağlantısı",
    status: "open",
    createdAt: Date.now() - 60_000,
    ...overrides,
  };
}

type PanelProps = Parameters<typeof ReportsPanel>[0];

function renderPanel(overrides: Partial<PanelProps> = {}) {
  const baseProps: PanelProps = {
    open: true,
    onClose: vi.fn(),
    uid: "alice",
    moderator: false,
    myReports: [],
    myReportsError: null,
    queue: [],
    queueLoading: false,
    queueError: null,
    onStatus: vi.fn(async () => undefined),
    bans: [],
    onBan: vi.fn(async () => undefined),
    onLiftBan: vi.fn(async () => undefined),
    onWarn: vi.fn(async () => undefined),
    onTakedown: vi.fn(async () => undefined),
    appeals: [],
    onResolveAppeal: vi.fn(async () => undefined),
    modActions: [],
    announcements: [],
    onCreateAnnouncement: vi.fn(async () => undefined),
    onDeleteAnnouncement: vi.fn(async () => undefined),
    onFetchHistory: vi.fn(async (): Promise<TargetHistory> => ({ reports: [], warningCount: 0, ban: null })),
  };
  return render(createElement(ReportsPanel, { ...baseProps, ...overrides }));
}

function clickMenu(name: RegExp) {
  const nav = screen.getByRole("navigation", { name: "Yönetim menüsü" });
  fireEvent.click(within(nav).getByRole("button", { name }));
}

describe("ReportsPanel · yetki sınırları ve çekmece", () => {
  it("moderatör olmayan kullanıcı yalnız kendi raporlarını görür, Kuyruk ve İncelenenler yoktur", () => {
    renderPanel({
      moderator: false,
      myReports: [report({ status: "actioned", resolution: "Spam kaldırıldı." })],
      queue: [report({ id: "rp-secret" })],
    });
    expect(screen.getByText(/Gönderi · Spam \/ reklam/)).toBeTruthy();
    expect(screen.getByText("İşlem yapıldı")).toBeTruthy();
    expect(screen.getByText(/Spam kaldırıldı/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Kuyruk/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /İncelenenler/ })).toBeNull();
    expect(screen.queryByText(/#rp-secret/)).toBeNull();
  });

  it("moderatör bile olsa çekmece (varsayılan) düzeninde yönetim sekmeleri görünmez", () => {
    renderPanel({ moderator: true, queue: [report({ id: "rp-hidden" })] });
    expect(screen.queryByRole("button", { name: /Kuyruk/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /İncelenenler/ })).toBeNull();
    expect(screen.queryByText(/#rp-hidden/)).toBeNull();
  });

  it("moderatör Kuyruk'ta açık raporu incelendi olarak kapatır veya not bırakır", async () => {
    const onStatus = vi.fn(async () => undefined);
    renderPanel({ admin: true, uid: "mod1", moderator: true, queue: [report()], onStatus });
    clickMenu(/Kuyruk/);
    fireEvent.click(screen.getByRole("button", { name: /İncelendi \(Kapat\)/ }));
    await waitFor(() => expect(onStatus).toHaveBeenCalledWith("rp-test001", "reviewed", undefined));

    fireEvent.click(screen.getByRole("button", { name: "Not" }));
    fireEvent.change(screen.getByLabelText(/Moderatör notu/), { target: { value: "İçerik kurallara uygun." } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onStatus).toHaveBeenCalledWith("rp-test001", "reviewed", "İçerik kurallara uygun."));
  });

  it("kuyruk okuma hatasını yutmadan moderatöre gösterir", () => {
    renderPanel({ admin: true, uid: "mod1", moderator: true, queueError: "Missing or insufficient permissions." });
    clickMenu(/Kuyruk/);
    expect(screen.getByRole("alert").textContent).toContain("permissions");
  });

  it("Escape ve Kapat düğmesi paneli kapatır", () => {
    const onClose = vi.fn();
    renderPanel({ onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("ReportsPanel · Kuyruk yaptırım akışları", () => {
  const openOwned = (overrides: Partial<Report> = {}) =>
    report({ targetOwnerUid: "spammer", status: "open", ...overrides });

  it("uyarı kısa gerekçede kilitli kalır; geçerli gerekçede kanıt statüsünü yazıp uyarıyı gönderir", async () => {
    const order: string[] = [];
    const onStatus = vi.fn(async () => { order.push("status"); });
    const onWarn = vi.fn(async () => { order.push("warn"); });
    renderPanel({ admin: true, uid: "mod1", moderator: true, queue: [openOwned()], onStatus, onWarn });
    clickMenu(/Kuyruk/);
    fireEvent.click(screen.getByRole("button", { name: "Uyarı gönder" }));
    const submit = screen.getByRole("button", { name: "Uyarıyı gönder" }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText(/Uyarı gerekçesi/), { target: { value: "kısa" } });
    expect(submit.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Uyarı gerekçesi/), { target: { value: "Reklam bağlantısı paylaşmayın." } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(onWarn).toHaveBeenCalledWith(expect.objectContaining({ id: "rp-test001" }), "Reklam bağlantısı paylaşmayın."));
    expect(onStatus).toHaveBeenCalledWith("rp-test001", "actioned", "Uyarı gönderildi: Reklam bağlantısı paylaşmayın.");
    expect(order).toEqual(["status", "warn"]);
  });

  it("içerik kalıcı silme iki aşamalı onay ister; kullanıcı raporunda gösterilmez", async () => {
    const onTakedown = vi.fn(async () => undefined);
    const { unmount } = renderPanel({ admin: true, uid: "mod1", moderator: true, queue: [openOwned()], onTakedown });
    clickMenu(/Kuyruk/);
    fireEvent.click(screen.getByRole("button", { name: /İçeriği kalıcı sil/ }));
    expect(onTakedown).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Kalıcı sil/ }));
    await waitFor(() => expect(onTakedown).toHaveBeenCalledWith(expect.objectContaining({ id: "rp-test001" })));
    unmount();

    renderPanel({
      admin: true,
      uid: "mod1",
      moderator: true,
      queue: [openOwned({ id: "rp-user", targetType: "user", targetId: "spammer" })],
    });
    clickMenu(/Kuyruk/);
    expect(screen.queryByRole("button", { name: /İçeriği kalıcı sil/ })).toBeNull();
  });

  it("askıya alma varsayılan olarak içeriği de siler, kanıt statüsünü yazar ve ban atar", async () => {
    const order: string[] = [];
    const onTakedown = vi.fn(async () => { order.push("takedown"); });
    const onStatus = vi.fn(async () => { order.push("status"); });
    const onBan = vi.fn(async () => { order.push("ban"); });
    const target = openOwned();
    renderPanel({ admin: true, uid: "mod1", moderator: true, queue: [target], onTakedown, onStatus, onBan });
    clickMenu(/Kuyruk/);
    fireEvent.click(screen.getByRole("button", { name: /Hesabı askıya al/ }));
    fireEvent.change(screen.getByLabelText("Süre"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText(/Gerekçe/), { target: { value: "Tekrarlayan reklam paylaşımı." } });
    fireEvent.click(screen.getByRole("button", { name: "Askıya al" }));

    await waitFor(() => expect(onBan).toHaveBeenCalledWith(target, 7, "Tekrarlayan reklam paylaşımı."));
    expect(order).toEqual(["takedown", "status", "ban"]);
  });

  it("askıya almada içerik silme kutusu kapatılırsa yalnız durum ve ban yazılır; moderatör kendine ban göremez", async () => {
    const onTakedown = vi.fn(async () => undefined);
    const onBan = vi.fn(async () => undefined);
    const { unmount } = renderPanel({ admin: true, uid: "mod1", moderator: true, queue: [openOwned()], onTakedown, onBan });
    clickMenu(/Kuyruk/);
    fireEvent.click(screen.getByRole("button", { name: /Hesabı askıya al/ }));
    fireEvent.click(screen.getByLabelText("İçeriği de kalıcı sil"));
    fireEvent.change(screen.getByLabelText(/Gerekçe/), { target: { value: "Tekrarlayan reklam paylaşımı." } });
    fireEvent.click(screen.getByRole("button", { name: "Askıya al" }));
    await waitFor(() => expect(onBan).toHaveBeenCalledTimes(1));
    expect(onTakedown).not.toHaveBeenCalled();
    unmount();

    renderPanel({ admin: true, uid: "spammer", moderator: true, queue: [openOwned()] });
    clickMenu(/Kuyruk/);
    expect(screen.queryByRole("button", { name: /Hesabı askıya al/ })).toBeNull();
  });
});

describe("ReportsPanel · İncelenenler bölümü ve türüne göre ayrım", () => {
  const resolvedFixtures: Report[] = [
    report({
      id: "rp-del01",
      targetType: "place",
      targetId: "pl-1",
      targetOwnerUid: "u-del",
      reason: "privacy",
      status: "actioned",
      resolution: "İçerik kalıcı olarak kaldırıldı.",
    }),
    report({
      id: "rp-ban01",
      targetType: "post",
      targetId: "post-9",
      targetOwnerUid: "u-ban",
      reason: "spam",
      status: "actioned",
      resolution: "Hesap askıya alındı (kalıcı): Spam botu.",
    }),
    report({
      id: "rp-wrn01",
      targetType: "story",
      targetId: "st-3",
      targetOwnerUid: "u-warn",
      reason: "harassment",
      status: "actioned",
      resolution: "Uyarı gönderildi: Üsluba dikkat edin.",
    }),
    report({
      id: "rp-cls01",
      targetType: "user",
      targetId: "u-clean",
      reason: "other",
      status: "reviewed",
      resolution: "İhlal saptanmadı.",
    }),
  ];

  const activeBan: Ban = {
    uid: "u-ban",
    reason: "Spam botu.",
    reportId: "rp-ban01",
    createdBy: "mod1",
    createdAt: Date.now() - 5000,
  };

  it("işlem görmüş raporlar Kuyruk'tan kalkar, İncelenenler'e gider ve yaptırım kutuları gizlenir", async () => {
    const onLiftBan = vi.fn(async () => undefined);
    renderPanel({
      admin: true,
      uid: "mod1",
      moderator: true,
      queue: resolvedFixtures,
      bans: [activeBan],
      onLiftBan,
    });

    // Kuyruk'ta sonuçlanmış hiçbir rapor kalmamalıdır
    clickMenu(/Kuyruk/);
    expect(screen.getByText(/Bekleyen açık rapor kalmadı/)).toBeTruthy();
    expect(screen.queryByText(/#rp-del01/)).toBeNull();

    // İncelenenler sekmesine geçildiğinde raporlar görünür ama yaptırım kutuları görünmez ("orası gitsin")
    clickMenu(/İncelenenler · 4/);
    expect(screen.getByText(/#rp-del01/)).toBeTruthy();
    expect(screen.getByText(/#rp-ban01/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Uyarı gönder" })).toBeNull();
    expect(screen.queryByRole("button", { name: /İçeriği kalıcı sil/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Hesabı askıya al/ })).toBeNull();

    // Etkin ban varsa Banı kaldır düğmesi çalışmaya devam eder
    expect(screen.getByText(/Askıda: kalıcı/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Banı kaldır" }));
    await waitFor(() => expect(onLiftBan).toHaveBeenCalledWith("u-ban"));
  });

  it("İncelenenler'de raporlar hem işlem türüne hem de içerik türüne göre ayrılır ve süzülür", () => {
    const modActions: ModAction[] = [
      { id: "ma-1", actorUid: "mod1", action: "takedown", reportId: "rp-del01", createdAt: Date.now() },
      { id: "ma-2", actorUid: "mod1", action: "ban", reportId: "rp-ban01", createdAt: Date.now() },
      { id: "ma-3", actorUid: "mod1", action: "warn", reportId: "rp-wrn01", createdAt: Date.now() },
    ];
    renderPanel({ admin: true, uid: "mod1", moderator: true, queue: resolvedFixtures, modActions });
    clickMenu(/İncelenenler · 4/);

    // Tümü görünümünde 4 ayrı kategori başlığıyla gruplanır
    expect(screen.getByRole("region", { name: "Kalıcı Silinenler" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Askıya Alınanlar" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Uyarı Verilenler" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "İncelenip Kapatılanlar" })).toBeTruthy();

    // İşlem türü sekmesi: yalnız Kalıcı Silinenler
    const kindGroup = screen.getByRole("group", { name: "İşlem türüne göre ayır" });
    fireEvent.click(within(kindGroup).getByRole("button", { name: /Kalıcı Silinenler · 1/ }));
    expect(screen.getByText(/#rp-del01/)).toBeTruthy();
    expect(screen.queryByText(/#rp-ban01/)).toBeNull();
    expect(screen.queryByText(/#rp-wrn01/)).toBeNull();

    // Tekrar Tümü + İçerik türü süzgeci: yalnız Hikâye (st-3)
    fireEvent.click(within(kindGroup).getByRole("button", { name: /Tümü · 4/ }));
    fireEvent.change(screen.getByLabelText("İçerik türüne göre süz"), { target: { value: "story" } });
    expect(screen.getByText(/#rp-wrn01/)).toBeTruthy();
    expect(screen.queryByText(/#rp-del01/)).toBeNull();
    expect(screen.queryByText(/#rp-ban01/)).toBeNull();
  });
});

describe("ReportsPanel · geçmiş, itiraz, duyuru, kayıtlar ve kontrol paneli", () => {
  it("hedef geçmişi rapor sayısını ve önceki uyarıları gösterir", async () => {
    const onFetchHistory = vi.fn(async (): Promise<TargetHistory> => ({
      reports: [report(), report({ id: "rp-2" })],
      warningCount: 3,
      ban: null,
    }));
    renderPanel({ admin: true, uid: "mod1", moderator: true, queue: [report({ targetOwnerUid: "spammer" })], onFetchHistory });
    clickMenu(/Kuyruk/);
    fireEvent.click(screen.getByRole("button", { name: /Geçmiş/ }));
    await waitFor(() => expect(screen.getByText(/3/)).toBeTruthy());
    expect(onFetchHistory).toHaveBeenCalledWith("spammer");
  });

  it("itiraz sekmesi kabul/red yazar ve ban kaldırmayı ayrı düğmeyle sunar", async () => {
    const appeal: Appeal = { id: "ap-spammer", uid: "spammer", message: "Yanlışlıkla oldu, özür dilerim.", status: "open", createdAt: Date.now() };
    const ban: Ban = { uid: "spammer", reason: "Spam", reportId: "rp-1", createdBy: "mod1", createdAt: 1 };
    const onResolveAppeal = vi.fn(async () => undefined);
    const onLiftBan = vi.fn(async () => undefined);
    renderPanel({ admin: true, uid: "mod1", moderator: true, appeals: [appeal], bans: [ban], onResolveAppeal, onLiftBan });
    clickMenu(/İtirazlar · 1/);
    fireEvent.click(screen.getByRole("button", { name: "Kabul et" }));
    await waitFor(() => expect(onResolveAppeal).toHaveBeenCalledWith("ap-spammer", "accepted"));
    expect(onLiftBan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Banı kaldır" }));
    await waitFor(() => expect(onLiftBan).toHaveBeenCalledWith("spammer"));
  });

  it("duyuru sekmesi yeni duyuru yayınlar, mevcut duyuruyu siler ve kayıtları listeler", async () => {
    const onCreateAnnouncement = vi.fn(async () => undefined);
    const onDeleteAnnouncement = vi.fn(async () => undefined);
    const existing: Announcement = { id: "an-1", title: "Bakım", body: "Bu gece kısa kesinti.", createdBy: "mod1", createdAt: Date.now() };
    const actions: ModAction[] = [{ id: "ma-1", actorUid: "mod123456", action: "takedown", targetType: "post", targetId: "p1", targetOwnerUid: "u98765432", detail: "post/p1", createdAt: Date.now() }];
    renderPanel({ admin: true, uid: "mod1", moderator: true, announcements: [existing], modActions: actions, onCreateAnnouncement, onDeleteAnnouncement });

    clickMenu(/Duyurular/);
    fireEvent.change(screen.getByLabelText("Başlık"), { target: { value: "Kurallar güncellendi" } });
    fireEvent.change(screen.getByLabelText("Metin"), { target: { value: "Lütfen topluluk ilkelerini okuyun." } });
    fireEvent.click(screen.getByRole("button", { name: "Yayınla" }));
    await waitFor(() => expect(onCreateAnnouncement).toHaveBeenCalledWith("Kurallar güncellendi", "Lütfen topluluk ilkelerini okuyun."));
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    await waitFor(() => expect(onDeleteAnnouncement).toHaveBeenCalledWith("an-1"));

    clickMenu(/Kayıtlar/);
    expect(screen.getByText("İçerik kalıcı silindi")).toBeTruthy();
  });

  it("Kontrol Paneli özet kartları Bekleyen Rapor'dan Kuyruk'a, İncelenen Rapor'dan İncelenenler'e geçer", () => {
    renderPanel({
      admin: true,
      uid: "mod1",
      moderator: true,
      queue: [
        report({ id: "rp-open1", status: "open" }),
        report({ id: "rp-done1", status: "actioned", resolution: "İçerik kalıcı olarak kaldırıldı." }),
      ],
    });
    expect(screen.getByRole("heading", { name: "Yönetim Paneli" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /İncelenen Rapor/ }));
    expect(screen.getByText(/#rp-done1/)).toBeTruthy();

    clickMenu(/Kontrol Paneli/);
    fireEvent.click(screen.getByRole("button", { name: /Bekleyen Rapor/ }));
    expect(screen.getByText(/#rp-open1/)).toBeTruthy();
  });
});
