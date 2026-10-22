import { describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({ db: {} }));
vi.mock("./notifications", () => ({ createNotification: vi.fn() }));

import { friendshipIdFor, normalizeFriendIndex, normalizeFriendRequest, normalizeFriendship } from "./friendships";

/** Denetim 2026-10-22: P16 sonrası eklenen modülün saf kısmı için karakterizasyon. */
const ts = (ms: number) => ({ toMillis: () => ms });

describe("friendshipIdFor", () => {
  it("sıradan bağımsız tek kimlik üretir ve boşlukları kırpar", () => {
    expect(friendshipIdFor("u2", "u1")).toBe("u1_u2");
    expect(friendshipIdFor(" u1 ", "u2")).toBe(friendshipIdFor("u2", "u1"));
  });

  it("boş kimlik ve kendine istek kodlu hatayla reddedilir", () => {
    expect(() => friendshipIdFor("", "u1")).toThrow(expect.objectContaining({ code: "friendship/uid-invalid" }));
    expect(() => friendshipIdFor("u1", " u1")).toThrow(expect.objectContaining({ code: "friendship/self" }));
  });
});

describe("normalize*", () => {
  it("istek: eksik alanlara güvenli varsayılan, Timestamp → ms", () => {
    expect(normalizeFriendRequest("u9", { createdAt: ts(5) })).toEqual({ id: "u9", fromUid: "u9", fromName: "Gezgin", toUid: "", createdAt: 5 });
    expect(normalizeFriendRequest("x", { fromUid: "a", fromName: "Ada", toUid: "b", createdAt: 7 }).fromName).toBe("Ada");
  });

  it("arkadaşlık: kullanıcılar sıralanır; rol alanı yoksa sıralı ilk/ikinci kullanılır", () => {
    const friendship = normalizeFriendship("a_b", { users: ["b", "a"], updatedAt: ts(9) });
    expect(friendship).toMatchObject({ users: ["a", "b"], requesterUid: "a", recipientUid: "b", status: "accepted", createdAt: 0, updatedAt: 9 });
  });

  it("kuşkulu girdi: tek kullanıcılı belge çökmez, boş ikinci kimlikle döner (davranış belgelenir)", () => {
    expect(normalizeFriendship("bozuk", { users: ["a"] }).users).toEqual(["a", ""]);
    expect(normalizeFriendship("bozuk", {}).users).toEqual(["", ""]);
  });

  it("dizin kaydı: ad yoksa 'Gezgin'", () => {
    expect(normalizeFriendIndex({ friendUid: "u2", since: ts(3) })).toEqual({ friendUid: "u2", friendName: "Gezgin", since: 3 });
  });
});
