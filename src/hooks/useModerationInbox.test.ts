// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useModerationInbox, useModeratorAccess } from "./useModerationInbox";

/**
 * F1-3 davranış kilidi. En kritik iddia: **hangi aboneliğin hangi koşulda
 * bağlandığı**. Kuyruk yalnız Yönetim Paneli'nde dinlenir; cihaz hesabında
 * hiçbir Firestore aboneliği açılmaz (Spark kotası).
 */
const lib = vi.hoisted(() => ({
  fetchModeratorAccess: vi.fn(),
  subscribeActiveBans: vi.fn(),
  subscribeAnnouncements: vi.fn(),
  subscribeAppeals: vi.fn(),
  subscribeModActions: vi.fn(),
  subscribeModerationQueue: vi.fn(),
  subscribeMyAppeals: vi.fn(),
  subscribeMyBan: vi.fn(),
  subscribeMyReports: vi.fn(),
  subscribeMyWarnings: vi.fn(),
}));

vi.mock("../lib/moderation", () => lib);

const noop = () => {};

beforeEach(() => {
  for (const fn of Object.values(lib)) {
    fn.mockReset();
    fn.mockReturnValue(noop as never);
  }
  lib.fetchModeratorAccess.mockResolvedValue(false);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const args = (over: Partial<Parameters<typeof useModerationInbox>[0]> = {}) => ({
  uid: "u1",
  cloudEnabled: true,
  reportsOpen: false,
  adminOpen: false,
  moderator: false,
  setModerator: (() => {}) as never,
  ...over,
});

describe("useModeratorAccess", () => {
  it("cihaz hesabında erişim sorgusu yapmaz, moderatör false", () => {
    const { result } = renderHook(() => useModeratorAccess("u1", false));
    expect(result.current.moderator).toBe(false);
    expect(lib.fetchModeratorAccess).not.toHaveBeenCalled();
  });

  it("bulut hesabında erişimi okur", async () => {
    lib.fetchModeratorAccess.mockResolvedValue(true);
    const { result } = renderHook(() => useModeratorAccess("u1", true));
    await waitFor(() => expect(result.current.moderator).toBe(true));
  });
});

describe("useModerationInbox — abonelik koşulları", () => {
  it("cihaz hesabı: hiçbir abonelik bağlanmaz", () => {
    renderHook(() => useModerationInbox(args({ cloudEnabled: false })));
    expect(lib.subscribeMyReports).not.toHaveBeenCalled();
    expect(lib.subscribeAnnouncements).not.toHaveBeenCalled();
    expect(lib.subscribeModerationQueue).not.toHaveBeenCalled();
  });

  it("bulut hesabı: duyurular açılır, kuyruk AÇILMAZ (panel kapalı)", () => {
    renderHook(() => useModerationInbox(args({ cloudEnabled: true })));
    expect(lib.subscribeAnnouncements).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));
    expect(lib.subscribeModerationQueue).not.toHaveBeenCalled();
    // "Raporlarım" çekmecesi kapalıyken kendi raporları da çekilmez.
    expect(lib.subscribeMyReports).not.toHaveBeenCalled();
  });

  it("raporlar çekmecesi açılınca kendi raporları bağlanır", () => {
    renderHook(() => useModerationInbox(args({ reportsOpen: true })));
    expect(lib.subscribeMyReports).toHaveBeenCalledWith("u1", expect.any(Function), expect.any(Function));
    expect(lib.subscribeModerationQueue).not.toHaveBeenCalled();
  });

  it("kuyruk yalnız Yönetim Paneli + moderatör birlikteyken bağlanır", () => {
    const { rerender } = renderHook((p: ReturnType<typeof args>) => useModerationInbox(p), {
      initialProps: args({ adminOpen: true, moderator: false }),
    });
    expect(lib.subscribeModerationQueue).not.toHaveBeenCalled();

    rerender(args({ adminOpen: true, moderator: true }));
    expect(lib.subscribeModerationQueue).toHaveBeenCalledTimes(1);
    // Moderatör akışları da bu bayrakla açılır.
    expect(lib.subscribeAppeals).toHaveBeenCalled();
    expect(lib.subscribeModActions).toHaveBeenCalled();
    expect(lib.subscribeActiveBans).toHaveBeenCalled();
  });

  it("moderatör olmayan bulut hesabında ban/itiraz/işlem akışı açılmaz", () => {
    renderHook(() => useModerationInbox(args({ adminOpen: true, moderator: false })));
    expect(lib.subscribeActiveBans).not.toHaveBeenCalled();
    expect(lib.subscribeAppeals).not.toHaveBeenCalled();
    expect(lib.subscribeModActions).not.toHaveBeenCalled();
    // Kendi askı/uyarı durumu ise her bulut hesabında dinlenir.
    expect(lib.subscribeMyBan).toHaveBeenCalled();
    expect(lib.subscribeMyWarnings).toHaveBeenCalled();
  });

  it("sökümde tüm abonelik iptalleri çağrılır", () => {
    const stoppers = new Map<string, ReturnType<typeof vi.fn>>();
    const make = (name: string) => {
      const stop = vi.fn();
      stoppers.set(name, stop);
      return stop;
    };
    lib.subscribeAnnouncements.mockReturnValue(make("announcements") as never);
    lib.subscribeMyBan.mockReturnValue(make("myBan") as never);
    lib.subscribeMyWarnings.mockReturnValue(make("warnings") as never);
    lib.subscribeMyAppeals.mockReturnValue(make("myAppeals") as never);
    lib.subscribeAppeals.mockReturnValue(make("appeals") as never);
    lib.subscribeModActions.mockReturnValue(make("actions") as never);
    lib.subscribeActiveBans.mockReturnValue(make("bans") as never);
    lib.subscribeModerationQueue.mockReturnValue(make("queue") as never);

    const { unmount } = renderHook(() => useModerationInbox(args({ adminOpen: true, moderator: true })));
    act(() => unmount());

    for (const [name, stop] of stoppers) expect(stop, name).toHaveBeenCalled();
  });
});
