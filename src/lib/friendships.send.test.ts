import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `sendFriendRequest` davranış kilidi.
 *
 * NEDEN VAR: kullanıcı raporu "istek gönderilemedi, yetkin yok" idi. Firestore
 * `permission-denied` hatası tek bir genel metne dönüştüğünde iki farklı durum
 * ayırt edilemiyordu:
 *   1) Aynı kişiye bekleyen istek zaten var (create yerine update olur, kural kapalı)
 *   2) İstemci ile dağıtılmış kurallar uyuşmuyor
 *
 * Bu dosya, güncel `sendFriendRequest` sözleşmesini (kod + belge yolu + kendi
 * kendini onarma) kilitler. Saf yardımcılar `friendships.test.ts` içindedir;
 * burada ağ/kural davranışı vardır.
 */
const h = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  createNotification: vi.fn(),
  warn: vi.fn(),
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

import { sendFriendRequest } from "./friendships";

const exists = (data?: Record<string, unknown>) => ({ exists: () => true, data: () => data ?? {} });
const missing = () => ({ exists: () => false, data: () => ({}) });
const denied = () => Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });

/** `code` alanını taşıyan uygulama hatasını yakalar. */
async function codeOf(run: Promise<unknown>): Promise<string | undefined> {
  try {
    await run;
    return undefined;
  } catch (failure) {
    return (failure as { code?: string }).code;
  }
}

beforeEach(() => {
  h.getDoc.mockReset();
  h.setDoc.mockReset();
  h.deleteDoc.mockReset();
  h.createNotification.mockReset();
  h.warn.mockReset();
  vi.spyOn(console, "warn").mockImplementation(h.warn);
  h.setDoc.mockResolvedValue(undefined);
  h.deleteDoc.mockResolvedValue(undefined);
  h.createNotification.mockResolvedValue(undefined);
});

describe("sendFriendRequest — giriş doğrulaması", () => {
  it("boş kimlik ve kendine istek, ağa çıkmadan kodlu hatayla reddedilir", async () => {
    expect(await codeOf(sendFriendRequest({ fromUid: " ", fromName: "Ada", toUid: "u2" }))).toBe("friend-request/uid-invalid");
    expect(await codeOf(sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u1" }))).toBe("friend-request/self");
    expect(h.getDoc).not.toHaveBeenCalled();
    expect(h.setDoc).not.toHaveBeenCalled();
  });
});

describe("sendFriendRequest — kendi kendini onarma", () => {
  it("karşı taraf arkadaşlığı bitirdiyse artık indeks silinir ve istek yazılır", async () => {
    h.getDoc
      .mockResolvedValueOnce(exists()) // users/u1/friends/u2 → artık kayıt
      .mockResolvedValueOnce(exists({ users: ["u1"] })) // friendships/u1_u2 → u2 yok
      .mockResolvedValueOnce(missing()); // users/u1/friendRequests/u2 → karşı istek yok

    await expect(sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" })).resolves.toBeUndefined();

    expect(h.deleteDoc).toHaveBeenCalledWith({ path: "users/u1/friends/u2" });
    expect(h.setDoc).toHaveBeenCalledWith(
      { path: "users/u2/friendRequests/u1" },
      expect.objectContaining({ fromUid: "u1", toUid: "u2", fromName: "Ada", createdAt: "SERVER_TS" }),
    );
  });

  it("arkadaşlık hâlâ geçerliyse 'already-friends' koduyla durur, yazma yapmaz", async () => {
    h.getDoc
      .mockResolvedValueOnce(exists()) // kendi indeksim var
      .mockResolvedValueOnce(exists({ users: ["u1", "u2"] })); // arkadaşlık sürüyor

    expect(await codeOf(sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" }))).toBe("friend-request/already-friends");
    expect(h.deleteDoc).not.toHaveBeenCalled();
    expect(h.setDoc).not.toHaveBeenCalled();
  });
});

describe("sendFriendRequest — hata eşlemesi", () => {
  it("karşı tarafta bekleyen istek varsa 'opposite-exists' döner", async () => {
    h.getDoc
      .mockResolvedValueOnce(missing()) // kendi indeksim yok
      .mockResolvedValueOnce(exists()); // users/u1/friendRequests/u2 → o bana yazmış

    expect(await codeOf(sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" }))).toBe("friend-request/opposite-exists");
    expect(h.setDoc).not.toHaveBeenCalled();
  });

  it("create permission-denied ise 'exists' koduna çevrilir (genel mesaj değil)", async () => {
    h.getDoc.mockResolvedValueOnce(missing()).mockResolvedValueOnce(missing());
    h.setDoc.mockRejectedValueOnce(denied());

    expect(await codeOf(sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" }))).toBe("friend-request/exists");
  });

  it("permission-denied dışındaki yazma hatası olduğu gibi yukarı çıkar", async () => {
    h.getDoc.mockResolvedValueOnce(missing()).mockResolvedValueOnce(missing());
    const offline = Object.assign(new Error("unavailable"), { code: "unavailable" });
    h.setDoc.mockRejectedValueOnce(offline);

    await expect(sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" })).rejects.toBe(offline);
  });
});

describe("sendFriendRequest — bildirim", () => {
  it("bildirim yazılamazsa istek yine de başarılı sayılır, hata yutulmaz (uyarı görünür)", async () => {
    h.getDoc.mockResolvedValueOnce(missing()).mockResolvedValueOnce(missing());
    h.createNotification.mockRejectedValueOnce(new Error("bildirim kapalı"));

    await expect(sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" })).resolves.toBeUndefined();
    expect(h.warn).toHaveBeenCalled();
  });

  it("başarılı akışta alıcıya friend_request bildirimi yazılır", async () => {
    h.getDoc.mockResolvedValueOnce(missing()).mockResolvedValueOnce(missing());

    await sendFriendRequest({ fromUid: "u1", fromName: "Ada", toUid: "u2" });

    expect(h.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUid: "u2", actorUid: "u1", type: "friend_request", targetId: "u1" }),
    );
  });

  it("ad boşsa 'Gezgin'e düşer ve 40 karakterle sınırlanır", async () => {
    h.getDoc.mockResolvedValueOnce(missing()).mockResolvedValueOnce(missing());
    await sendFriendRequest({ fromUid: "u1", fromName: "   ", toUid: "u2" });
    expect(h.setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ fromName: "Gezgin" }));

    h.setDoc.mockClear();
    h.getDoc.mockReset();
    h.getDoc.mockResolvedValueOnce(missing()).mockResolvedValueOnce(missing());
    await sendFriendRequest({ fromUid: "u1", fromName: "x".repeat(60), toUid: "u2" });
    expect(h.setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ fromName: "x".repeat(40) }));
  });

  // Kural `stringBetween(fromName, 2, 100)` ister. 1 karakterli ad gönderilirse
  // istek `permission-denied` alır ve kullanıcı yanlış mesaj görür ("zaten
  // istek göndermiş olabilirsin") — hata sınıfı sessiz ve yanıltıcıdır.
  it("1 karakterli ad kural sözleşmesine çekilir (min 2 karakter)", async () => {
    h.getDoc.mockResolvedValueOnce(missing()).mockResolvedValueOnce(missing());
    await sendFriendRequest({ fromUid: "u1", fromName: "A", toUid: "u2" });
    expect(h.setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ fromName: "Gezgin" }));

    h.setDoc.mockClear();
    h.getDoc.mockReset();
    h.getDoc.mockResolvedValueOnce(missing()).mockResolvedValueOnce(missing());
    await sendFriendRequest({ fromUid: "u1", fromName: " A ", toUid: "u2" });
    expect(h.setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ fromName: "Gezgin" }));
  });
});
