// @vitest-environment jsdom
/**
 * F1-6 adım 4 davranış kilidi — Explorer açılış/yaşam döngüsü bağlantıları.
 *
 * Kilitlenen sözler: `?tab=` kısayolu **bir kez** uygulanır ve adresten silinir,
 * aynı paylaşım bağlantısı iki kez açılmaz, yazar adı önbelleğe yazılır,
 * bekleyen davet açılışta tüketilir, cihaz hesabı profil dizinine yazmaz.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useExplorerLifecycle, type ExplorerLifecycleDeps } from "./useExplorerLifecycle";

const routeApi = vi.hoisted(() => ({ openPublishedRoute: vi.fn() }));
vi.mock("../lib/publishedRouteOpen", () => ({
  ROUTE_OPEN_MESSAGES: { opened: "Rota açıldı" },
  openPublishedRoute: routeApi.openPublishedRoute,
}));

const inviteApi = vi.hoisted(() => ({ takePendingInvite: vi.fn() }));
vi.mock("../utils/inviteLink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/inviteLink")>();
  return { ...actual, takePendingInvite: inviteApi.takePendingInvite };
});

const profileApi = vi.hoisted(() => ({ syncProfileForUser: vi.fn() }));
vi.mock("../lib/profileSync", () => ({
  syncProfileForUser: profileApi.syncProfileForUser,
  needsProfileSync: (user: { uid?: string; displayName?: string }) => Boolean(user?.uid && user?.displayName),
}));

function deps(over: Partial<ExplorerLifecycleDeps> = {}): ExplorerLifecycleDeps {
  return {
    user: null,
    notifications: [],
    setResumeRoute: vi.fn(),
    setAtlasOpen: vi.fn(),
    setToast: vi.fn(),
    setSpin: vi.fn(),
    setAddMode: vi.fn(),
    setDrawerOpen: vi.fn(),
    setFeedOpen: vi.fn(),
    setRecordsOpen: vi.fn(),
    setProfileOpen: vi.fn(),
    setMyPlacesOpen: vi.fn(),
    setSettingsOpen: vi.fn(),
    setStoryPlace: vi.fn(),
    setStreetPlace: vi.fn(),
    setNotificationsOpen: vi.fn(),
    setPanelOpen: vi.fn(),
    openSocial: vi.fn(),
    ...over,
  };
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  window.sessionStorage.clear();
  routeApi.openPublishedRoute.mockReset();
  inviteApi.takePendingInvite.mockReset().mockReturnValue(null);
});

afterEach(() => vi.restoreAllMocks());

describe("useExplorerLifecycle", () => {
  it("?tab=iz-birak kısayolunu bir kez uygular ve adresten siler", async () => {
    window.history.replaceState(null, "", "/?tab=iz-birak");
    const d = deps();
    const { rerender } = renderHook(() => useExplorerLifecycle(d));
    expect(d.setAddMode).toHaveBeenCalledWith(true);
    expect(d.setSpin).toHaveBeenCalledWith(false);
    expect(window.location.search).toBe("");
    rerender();
    expect((d.setAddMode as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("?tab=profil profil panelini açar, keşfet alt paneli açar", () => {
    window.history.replaceState(null, "", "/?tab=profil");
    const profile = deps();
    renderHook(() => useExplorerLifecycle(profile));
    expect(profile.setProfileOpen).toHaveBeenCalledWith(true);

    window.history.replaceState(null, "", "/?tab=kesfet");
    const explore = deps();
    renderHook(() => useExplorerLifecycle(explore));
    expect(explore.setPanelOpen).toHaveBeenCalledWith(true);
  });

  it("yayınlanmış rota bağlantısını açar; aynı bağlantı iki kez açılmaz", async () => {
    window.history.replaceState(null, "", "/?route=r1");
    routeApi.openPublishedRoute.mockResolvedValue({ status: "opened", route: { id: "r1" }, message: "ok" });
    const d = deps();
    const { rerender } = renderHook(() => useExplorerLifecycle(d));
    await waitFor(() => expect(d.setResumeRoute).toHaveBeenCalled());
    expect(routeApi.openPublishedRoute).toHaveBeenCalledTimes(1);
    rerender();
    expect(routeApi.openPublishedRoute).toHaveBeenCalledTimes(1);
  });

  it("başarısız rota açılışı kullanıcıya mesaj olarak döner", async () => {
    window.history.replaceState(null, "", "/?route=yok");
    routeApi.openPublishedRoute.mockResolvedValue({ status: "failed", route: null, message: "Rota bulunamadı" });
    const d = deps();
    renderHook(() => useExplorerLifecycle(d));
    await waitFor(() => expect(d.setToast).toHaveBeenCalledWith("Rota bulunamadı"));
    expect(d.setResumeRoute).not.toHaveBeenCalled();
  });

  it("yazar adını yalnız ad varken önbelleğe yazar", () => {
    const withName = deps({ user: { uid: "u1", backend: "device", displayName: "Deniz" } });
    renderHook(() => useExplorerLifecycle(withName));
    expect(window.localStorage.getItem("atlasia.author")).toBe("Deniz");

    const anon = deps({ user: { uid: "u2", backend: "device", displayName: "" } });
    renderHook(() => useExplorerLifecycle(anon));
    expect(window.localStorage.getItem("atlasia.author")).toBe("Deniz");
  });

  it("bekleyen daveti açar; profil dizinine yalnız bulut hesabı yazar", async () => {
    inviteApi.takePendingInvite.mockReturnValue({ code: "abc" });
    const cloud = deps({ user: { uid: "u1", backend: "firebase", displayName: "Deniz" } });
    renderHook(() => useExplorerLifecycle(cloud));
    expect(cloud.openSocial).toHaveBeenCalledWith({ kind: "invite", invite: { code: "abc" } });
    await waitFor(() => expect(profileApi.syncProfileForUser).toHaveBeenCalled());

    profileApi.syncProfileForUser.mockClear();
    const device = deps({ user: { uid: "u2", backend: "device", displayName: "Cihaz" } });
    renderHook(() => useExplorerLifecycle(device));
    expect(profileApi.syncProfileForUser).not.toHaveBeenCalled();
  });
});
