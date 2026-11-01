// @vitest-environment jsdom
/**
 * F2-1a davranış kilidi — moderasyon eylemleri.
 *
 * En kritik iddialar:
 *  1) Yetki istemcide varsayılmaz: oturum yoksa eylem sessizce geçmez, hata atar.
 *  2) Raporlayana bildirim **yalnız** ilk "actioned" geçişinde gider (tekrar
 *     kapatma spam üretmez).
 *  3) Ban/uyarı hedefi çözümü (targetOwnerUid → "user" ise targetId) korunur.
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useModerationActions } from "./useModerationActions";
import type { Report } from "../lib/moderation";

const lib = vi.hoisted(() => ({
  banUser: vi.fn(),
  createAnnouncement: vi.fn(),
  createAppeal: vi.fn(),
  deleteAnnouncement: vi.fn(),
  fetchTargetHistory: vi.fn(),
  liftBan: vi.fn(),
  logModAction: vi.fn(),
  notifyReportActioned: vi.fn(),
  resolveAppeal: vi.fn(),
  setReportStatus: vi.fn(),
  takedownReportTarget: vi.fn(),
  warnUser: vi.fn(),
}));
vi.mock("../lib/moderation", () => lib);

const report = (over: Partial<Report> = {}): Report => ({
  id: "r1",
  targetType: "place",
  targetId: "p1",
  targetOwnerUid: "owner-1",
  status: "open",
  ...over,
} as Report);

// NOT: `null` "oturum yok" demektir; `undefined` varsayılan parametreyi tetikler.
const setup = (uid: string | null = "mod-1", queue: Report[] = []) =>
  renderHook(() => useModerationActions({ uid: uid ?? undefined, queue })).result;

beforeEach(() => {
  for (const fn of Object.values(lib)) fn.mockReset();
  lib.notifyReportActioned.mockReturnValue(Promise.resolve());
  lib.fetchTargetHistory.mockResolvedValue({} as never);
});

describe("useModerationActions — oturum kapısı", () => {
  it("oturum yoksa rapor durumu hata atar, Firestore'a yazmaz", async () => {
    const result = setup(null);
    await expect(result.current.handleReportStatus("r1", "reviewed")).rejects.toThrow("Oturum bulunamadı.");
    expect(lib.setReportStatus).not.toHaveBeenCalled();
  });

  it("oturum varsa durum yazılır ve denetim kaydı bırakılır", async () => {
    const result = setup("mod-1");
    await result.current.handleReportStatus("r1", "reviewed", "inceliyorum");
    expect(lib.setReportStatus).toHaveBeenCalledWith("r1", "reviewed", "mod-1", "inceliyorum");
    expect(lib.logModAction).toHaveBeenCalledWith({ action: "report_status", reportId: "r1", detail: "reviewed" });
  });
});

describe("useModerationActions — raporlayana bildirim", () => {
  it("actioned geçişinde bulunan rapor için tek bildirim gider", async () => {
    const item = report({ status: "open" });
    const result = setup("mod-1", [item]);
    await result.current.handleReportStatus("r1", "actioned");
    expect(lib.notifyReportActioned).toHaveBeenCalledTimes(1);
    expect(lib.notifyReportActioned).toHaveBeenCalledWith(item, "mod-1");
  });

  it("rapor zaten actioned ise bildirim tekrar gitmez", async () => {
    const result = setup("mod-1", [report({ status: "actioned" })]);
    await result.current.handleReportStatus("r1", "actioned");
    expect(lib.notifyReportActioned).not.toHaveBeenCalled();
  });

  it("actioned dışı durumda bildirim yok", async () => {
    const result = setup("mod-1", [report({ status: "open" })]);
    await result.current.handleReportStatus("r1", "open");
    expect(lib.notifyReportActioned).not.toHaveBeenCalled();
  });

  it("bildirim hatası akışı kesmez (yalnız uyarı loglanır)", async () => {
    lib.notifyReportActioned.mockReturnValue(Promise.reject(new Error("yok")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = setup("mod-1", [report({ status: "open" })]);

    await expect(result.current.handleReportStatus("r1", "actioned")).resolves.toBeUndefined();
    expect(lib.setReportStatus).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("useModerationActions — ban / uyarı hedefi", () => {
  it("ban targetOwnerUid'yi kullanır ve denetim kaydı yazar", async () => {
    const result = setup();
    await result.current.handleBan(report(), 7, "spam");
    expect(lib.banUser).toHaveBeenCalledWith({ uid: "owner-1", reason: "spam", reportId: "r1", days: 7 });
    expect(lib.logModAction).toHaveBeenCalledWith(expect.objectContaining({ action: "ban", targetOwnerUid: "owner-1" }));
  });

  it("targetOwnerUid yoksa 'user' raporunda targetId'ye düşer", async () => {
    const result = setup();
    await result.current.handleBan(report({ targetOwnerUid: undefined, targetType: "user", targetId: "u-9" }), 7, "hakaret");
    expect(lib.banUser).toHaveBeenCalledWith(expect.objectContaining({ uid: "u-9" }));
  });

  it("hedef çözülemezse ban reddedilir", async () => {
    const result = setup();
    await expect(
      result.current.handleBan(report({ targetOwnerUid: undefined, targetType: "place", targetId: "p1" }), 7, "x"),
    ).rejects.toThrow("Bu raporun sahibi belirlenemedi; ban atılamaz.");
    expect(lib.banUser).not.toHaveBeenCalled();
  });

  it("uyarıda hedef yoksa reddedilir, varsa gönderilir", async () => {
    const result = setup();
    await expect(
      result.current.handleWarn(report({ targetOwnerUid: undefined, targetType: "story" }), "x"),
    ).rejects.toThrow("uyarı gönderilemez");
    await result.current.handleWarn(report(), "kural ihlali");
    expect(lib.warnUser).toHaveBeenCalledWith({ uid: "owner-1", reason: "kural ihlali", reportId: "r1" });
  });

  it("ban kaldırma denetim kaydı bırakır", async () => {
    const result = setup();
    await result.current.handleLiftBan("owner-1");
    expect(lib.liftBan).toHaveBeenCalledWith("owner-1");
    expect(lib.logModAction).toHaveBeenCalledWith({ action: "lift_ban", targetOwnerUid: "owner-1" });
  });
});

describe("useModerationActions — içerik kaldırma ve ince sarmalayıcılar", () => {
  it("içerik kaldırma önce hedefi kaldırır, sonra raporu actioned yapar", async () => {
    const result = setup("mod-1");
    const item = report();
    await result.current.handleTakedown(item);

    expect(lib.takedownReportTarget).toHaveBeenCalledWith(item);
    expect(lib.setReportStatus).toHaveBeenCalledWith(
      "r1", "actioned", "mod-1", "İçerik kalıcı olarak kaldırıldı.",
    );
    expect(lib.takedownReportTarget.mock.invocationCallOrder[0])
      .toBeLessThan(lib.setReportStatus.mock.invocationCallOrder[0]);
  });

  it("itiraz/duyuru sarmalayıcıları kitaplığa delege eder", async () => {
    const result = setup();
    await result.current.handleResolveAppeal("a1", "accepted");
    await result.current.handleCreateAnnouncement("Başlık", "Gövde");
    await result.current.handleDeleteAnnouncement("d1");
    await result.current.handleAppeal("itirazım var");
    await result.current.handleFetchHistory("u-1");

    expect(lib.resolveAppeal).toHaveBeenCalledWith("a1", "accepted");
    expect(lib.createAnnouncement).toHaveBeenCalledWith("Başlık", "Gövde");
    expect(lib.deleteAnnouncement).toHaveBeenCalledWith("d1");
    expect(lib.createAppeal).toHaveBeenCalledWith("itirazım var");
    expect(lib.fetchTargetHistory).toHaveBeenCalledWith("u-1");
  });
});
