import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `sendFriendRequest` davranış kilidi.
 *
 * Kullanıcı raporu: "istek gönderilemedi, yetkin yok" — bu mesaj Firestore'un
 * `permission-denied` hatasının genel bir metne dönüşmesinden çıkıyordu.
 * `permission-denied` iki farklı durumda gelir:
 *   1) Bekleyen istek zaten var (create, `allow update: false` yüzünden reddedilir)
 *   2) İstemci ile dağıtılmış kurallar uyuşmuyor
 * Bu testler ikisinin ayrı kodlarla raporlandığını ve 1. durumun kendi kendini
 * onardığını (sil + tekrar dene) doğrular.
 */
const h = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  createNotification: vi.fn(),
  consoleError: vi.fn(),
}));

vi.mock("./firebase", () => ({ db: {} }));
vi.mock("./notifications", () => ({ createNotification: h.createNotification }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  deleteDoc: h.deleteDoc,
  doc: (_db: unknown, path: string) => ({ path }),
  getDoc: h.getDoc,
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: () => "SERVER_TS",
  setDoc: h.setDoc,
  where: vi.fn(),
  writeBatch: vi.fn(),
}));

import { firestoreErrorCode, sendFriendRequest } from "./friendships";

const snap = (exists: boolean) => ({ exists: () => exists });
const denied = () => Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });

beforeEach(() => {
  h.getDoc.mockReset();
  h.setDoc.mockReset();
  h.deleteDoc.mockReset();
  h.createNotification.mockReset();
  h.consoleError.mockReset();
  h.consoleError.mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(h.consoleError);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  // Sıra: karşı kuyruk yok, kendi arkadaş indeksim yok.
  h.getDoc.mockResolvedValue(snap(false));
  h.setDoc.mockResolvedValue(undefined);
  h.deleteDoc.mockResolvedValue(undefined);
  h.createNotification.mockResolvedValue(undefined);
});

describe("firestoreErrorCode", () => {
  it("hata nesnesinden kodu okur, tanınmayan girdide boş döner", () => {
    expect(firestoreErrorCode(denied())).toBe("permission-denied");
    expect(firestoreErrorCode(new Error("x"))).toBe("");
    expect(firestoreErrorCode(null)).toBe("");
  });
});

describe("sendFriendRequest", () => {
  it("ilk denemede yazar ve alıcıya kanıtlı bildirim bırakır", async () => {
    await sendFriendRequest({ fromUid: "me", fromName: "  Ada  ", toUid: "u2" });

    expect(h.setDoc).toHaveBeenCalledTimes(1);
    expect(h.setDoc.mock.calls[0][0]).toEqual({ path: "users/u2/friendRequests/me" });
    expect(h.setDoc.mock.calls[0][1]).toMatchObject({ fromUid: "me", fromName: "Ada", toUid: "u2", createdAt: "SERVER_TS" });
    expect(h.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUid: "u2", actorUid: "me", type: "friend_request", targetId: "me" }),
    );
  });

  it("bekleyen istek varsa (permission-denied) temizler ve bir kez daha dener", async () => {
    h.setDoc.mockRejectedValueOnce(denied()).mockResolvedValueOnce(undefined);

    await sendFriendRequest({ fromUid: "me", fromName: "Ada", toUid: "u2" });

    expect(h.deleteDoc).toHaveBeenCalledWith({ path: "users/u2/friendRequests/me" });
    expect(h.setDoc).toHaveBeenCalledTimes(2);
    expect(h.createNotification).toHaveBeenCalledTimes(1);
    expect(h.consoleError).not.toHaveBeenCalled();
  });

  it("temizliğe rağmen reddedilirse 'kural uyuşmazlığı' koduyla ve konsol kanıtıyla döner", async () => {
    h.setDoc.mockRejectedValue(denied());

    await expect(sendFriendRequest({ fromUid: "me", fromName: "Ada", toUid: "u2" })).rejects.toMatchObject({
      code: "friend-request/rules-mismatch",
    });
    expect(h.consoleError).toHaveBeenCalled();
    expect(h.createNotification).not.toHaveBeenCalled();
  });

  it("temizlik de reddedilirse aynı kodla döner (sessizce yutulmaz)", async () => {
    h.setDoc.mockRejectedValue(denied());
    h.deleteDoc.mockRejectedValue(denied());

    await expect(sendFriendRequest({ fromUid: "me", fromName: "Ada", toUid: "u2" })).rejects.toMatchObject({
      code: "friend-request/rules-mismatch",
    });
    expect(h.setDoc).toHaveBeenCalledTimes(1);
  });

  it("karşı taraf zaten istek göndermişse yazmadan uyarır", async () => {
    h.getDoc.mockResolvedValueOnce(snap(true));

    await expect(sendFriendRequest({ fromUid: "me", fromName: "Ada", toUid: "u2" })).rejects.toMatchObject({
      code: "friend-request/opposite-exists",
    });
    expect(h.setDoc).not.toHaveBeenCalled();
  });

  it("zaten arkadaşsa kural reddetmeden anlaşılır kod döner", async () => {
    h.getDoc.mockResolvedValueOnce(snap(false)).mockResolvedValueOnce(snap(true));

    await expect(sendFriendRequest({ fromUid: "me", fromName: "Ada", toUid: "u2" })).rejects.toMatchObject({
      code: "friend-request/already-friends",
    });
    expect(h.setDoc).not.toHaveBeenCalled();
  });

  it("çevrimdışı hatası ayrı kodla raporlanır", async () => {
    h.setDoc.mockRejectedValueOnce(Object.assign(new Error("offline"), { code: "unavailable" }));

    await expect(sendFriendRequest({ fromUid: "me", fromName: "Ada", toUid: "u2" })).rejects.toMatchObject({
      code: "friend-request/offline",
    });
    expect(h.deleteDoc).not.toHaveBeenCalled();
  });

  it("oturum yoksa 'giriş yap' koduna eşlenir", async () => {
    h.setDoc.mockRejectedValueOnce(Object.assign(new Error("no auth"), { code: "unauthenticated" }));

    await expect(sendFriendRequest({ fromUid: "me", fromName: "Ada", toUid: "u2" })).rejects.toMatchObject({
      code: "friend-request/not-signed-in",
    });
  });

  it("kendine istek ve boş kimlik yazmadan reddedilir", async () => {
    await expect(sendFriendRequest({ fromUid: "me", fromName: "Ada", toUid: " me " })).rejects.toMatchObject({
      code: "friend-request/self",
    });
    await expect(sendFriendRequest({ fromUid: "", fromName: "Ada", toUid: "u2" })).rejects.toMatchObject({
      code: "friend-request/uid-invalid",
    });
    expect(h.setDoc).not.toHaveBeenCalled();
  });

  it("bildirim yazılamazsa istek yine de gönderilmiş sayılır (ana akış bozulmaz)", async () => {
    h.createNotification.mockRejectedValueOnce(denied());

    await expect(sendFriendRequest({ fromUid: "me", fromName: "Ada", toUid: "u2" })).resolves.toBeUndefined();
    expect(h.setDoc).toHaveBeenCalledTimes(1);
  });
});
