/**
 * Atlasia — arkadaşlık modeli birim testleri.
 *
 * Repoda arkadaşlık/follow sistemi OLMADIĞI doğrulandı (tek "takip" geçişi
 * `legal.ts` metninde ve `firestoreData.ts` içindeki "XP/rozet/takip
 * fonlanmıyor" ürün kararı notundaydı; hiçbir implementasyon yoktu). Bu yüzden
 * model sıfırdan, dizin koleksiyonu ve Cloud Functions olmadan kuruldu.
 *
 * Bu testler saf mantığı sınar. Gerçek güvenlik kuralları emülatör testinde
 * (`tests/firestore.rules.test.ts`) koşar — o tur bu sandbox'ta Java 21
 * olmadığı için ÇALIŞTIRILAMADI.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FRIENDSHIP_ID_SEPARATOR,
  acceptedFriends,
  friendshipIdFor,
  incomingRequests,
  isSafeFriendUid,
  mirrorPayload,
  normalizeFriendName,
  normalizeFriendship,
  normalizeFriendshipMirror,
  outgoingRequests,
  sortParticipants,
  validateFriendRequest,
  type FriendshipMirror,
} from "./friends";

function mirror(partial: Partial<FriendshipMirror> & { pairId: string }): FriendshipMirror {
  return {
    otherUid: "user-b",
    otherName: "Bora",
    direction: "outgoing",
    status: "pending",
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

describe("friendshipIdFor — deterministik sıralı çift", () => {
  it("iki taraf da aynı kimliği hesaplar (sıra bağımsız)", () => {
    expect(friendshipIdFor("user-a", "user-b")).toBe("user-a_user-b");
    expect(friendshipIdFor("user-b", "user-a")).toBe("user-a_user-b");
    expect(friendshipIdFor("user-a", "user-b")).toBe(friendshipIdFor("user-b", "user-a"));
  });

  it("sortParticipants her zaman küçük olanı öne koyar", () => {
    expect(sortParticipants("zzz", "aaa")).toEqual(["aaa", "zzz"]);
    expect(sortParticipants("aaa", "zzz")).toEqual(["aaa", "zzz"]);
    expect(sortParticipants("abc", "abd")).toEqual(["abc", "abd"]);
  });

  it("kimlik ayraç içermez ve sıralama ASCII ile tutarlıdır", () => {
    const pairId = friendshipIdFor("Z9", "a1");
    // 'Z' (0x5A) < 'a' (0x61) — hem JS hem Firestore kuralları aynı sırayı verir.
    expect(pairId).toBe("Z9_a1");
    expect(pairId.split(FRIENDSHIP_ID_SEPARATOR)).toEqual(["Z9", "a1"]);
  });

  it("İSTEMCİ SIRALAMASI KURALLARDAKİ İFADEYLE BİREBİR AYNI (çapraz doğrulama)", () => {
    // Bu, emülatör olmadan yapılabilecek en güçlü güvence: kurallardaki
    // sortedPairId ifadesi ile friendshipIdFor'un ürettiği sonuç aynı olmalı.
    const rules = readFileSync("firestore.rules", "utf8");
    expect(rules).toContain("function sortedPairId(a, b)");
    expect(rules).toMatch(/a < b \? a \+ '_' \+ b : b \+ '_' \+ a/);
    expect(rules).toContain("function friendshipPathFor(a, b)");
    // Kural, create'te pairId'nin bu ifadeye eşit olmasını zorunlu kılar.
    expect(rules).toMatch(/pairId == sortedPairId\(request\.resource\.data\.requesterUid, request\.resource\.data\.recipientUid\)/);

    // Aynı ifadeyi JS'te çalıştırıp istemci fonksiyonuyla karşılaştır.
    const rulesSortedPairId = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const cases: Array<[string, string]> = [
      ["user-a", "user-b"], ["user-b", "user-a"], ["Z9", "a1"], ["a1", "Z9"],
      ["0", "9"], ["aaa", "aaa2"], ["Ab", "ab"],
    ];
    for (const [a, b] of cases) {
      expect(friendshipIdFor(a, b)).toBe(rulesSortedPairId(a, b));
    }
  });
});

describe("isSafeFriendUid — sıralama ve enjeksiyon güvenliği", () => {
  it("Firebase UID biçimini kabul eder", () => {
    expect(isSafeFriendUid("Xy7qL2mNpR4sT9uV0wAbCdEfGh12")).toBe(true);
    expect(isSafeFriendUid("a")).toBe(true);
  });

  it("ayraç içeren kimliği reddeder (pairId'yi bölebilirdi)", () => {
    expect(isSafeFriendUid("user_a")).toBe(false);
    expect(isSafeFriendUid("a__b")).toBe(false);
  });

  it("ASCII dışını reddeder: JS '<' ile kural '<' farklı sıra verebilirdi", () => {
    expect(isSafeFriendUid("kullanıcı")).toBe(false); // 'ı' = U+0131
    expect(isSafeFriendUid("用户")).toBe(false);
    expect(isSafeFriendUid("uid\u00e9")).toBe(false);
  });

  it("boş ve aşırı uzun kimliği reddeder", () => {
    expect(isSafeFriendUid("")).toBe(false);
    expect(isSafeFriendUid("   ")).toBe(false);
    expect(isSafeFriendUid("x".repeat(129))).toBe(false);
    expect(isSafeFriendUid("x".repeat(128))).toBe(true);
  });

  it("kontrol karakterlerini reddeder", () => {
    expect(isSafeFriendUid("a\nb")).toBe(false);
    expect(isSafeFriendUid("a\tb")).toBe(false);
    expect(isSafeFriendUid("a\u0000b")).toBe(false);
  });
});

describe("validateFriendRequest", () => {
  it("kendine istek göndermeyi reddeder", () => {
    expect(validateFriendRequest("user-a", "user-a")).toBe("friend/self");
    expect(validateFriendRequest("user-a", " user-a ")).toBe("friend/self");
  });

  it("boş tarafları reddeder", () => {
    expect(validateFriendRequest("", "user-b")).toBe("friend/requester-required");
    expect(validateFriendRequest("user-a", "  ")).toBe("friend/recipient-required");
  });

  it("güvensiz kimliği reddeder", () => {
    expect(validateFriendRequest("user_a", "user-b")).toBe("friend/requester-uid-invalid");
    expect(validateFriendRequest("user-a", "kullanıcı")).toBe("friend/recipient-uid-invalid");
  });

  it("geçerli istekte null döner", () => {
    expect(validateFriendRequest("user-a", "user-b")).toBeNull();
  });
});

describe("normalizeFriendName — kişisel veri sınırı", () => {
  it("40 karaktere kırpar ve boş adı tarafsız etikete çevirir", () => {
    expect(normalizeFriendName("  Ada  ")).toBe("Ada");
    expect(normalizeFriendName("x".repeat(60))).toHaveLength(40);
    expect(normalizeFriendName("")).toBe("Gezgin");
    expect(normalizeFriendName(null)).toBe("Gezgin");
    expect(normalizeFriendName(undefined)).toBe("Gezgin");
  });

  it("telefon/e-posta gibi alanlar modelde HİÇ yok", () => {
    // Kişisel veriyi gereksiz açmama garantisinin yapısal kanıtı.
    const payload = mirrorPayload("p1", "user-b", "Bora", "incoming", "pending");
    expect(Object.keys(payload).sort()).toEqual([
      "createdAt", "direction", "otherName", "otherUid", "pairId", "status", "updatedAt",
    ]);
    expect(JSON.stringify(payload)).not.toMatch(/@|\+90|phone|email|telefon/i);
  });
});

describe("normalizeFriendship", () => {
  it("katılımcı listesi eksikse sıralı çiftten yeniden üretir", () => {
    const friendship = normalizeFriendship("user-a_user-b", {
      requesterUid: "user-b",
      recipientUid: "user-a",
      status: "accepted",
      requesterName: "Bora",
      recipientName: "Ada",
      createdAt: { toMillis: () => 100 },
      updatedAt: { toMillis: () => 200 },
      acceptedAt: { toMillis: () => 150 },
    });
    expect(friendship.participants).toEqual(["user-a", "user-b"]);
    expect(friendship.requesterUid).toBe("user-b");
    expect(friendship.acceptedAt).toBe(150);
  });

  it("bilinmeyen durumu pending'e düşürür (fail-safe)", () => {
    const friendship = normalizeFriendship("p1", {
      requesterUid: "a", recipientUid: "b", participants: ["a", "b"],
      status: "BLOATED", requesterName: "A", recipientName: "", createdAt: 1, updatedAt: 1,
    });
    expect(friendship.status).toBe("pending");
  });

  it("Timestamp benzeri nesneleri milisaniyeye çevirir", () => {
    const friendship = normalizeFriendship("p1", {
      requesterUid: "a", recipientUid: "b", participants: ["a", "b"], status: "pending",
      requesterName: "A", recipientName: "",
      createdAt: { toMillis: () => 1234 }, updatedAt: { toMillis: () => 5678 },
    });
    expect(friendship.createdAt).toBe(1234);
    expect(friendship.updatedAt).toBe(5678);
    expect(friendship.acceptedAt).toBe(0);
  });
});

describe("normalizeFriendshipMirror", () => {
  it("eksik alanları güvenli varsayılana çeker", () => {
    const entry = normalizeFriendshipMirror("p1", {});
    expect(entry).toEqual({
      pairId: "p1", otherUid: "", otherName: "Gezgin",
      direction: "incoming", status: "pending", createdAt: 0, updatedAt: 0,
    });
  });

  it("direction ve status kapalı listeden gelir", () => {
    expect(normalizeFriendshipMirror("p1", { direction: "outgoing" }).direction).toBe("outgoing");
    expect(normalizeFriendshipMirror("p1", { direction: "sideways" }).direction).toBe("incoming");
    expect(normalizeFriendshipMirror("p1", { status: "accepted" }).status).toBe("accepted");
    expect(normalizeFriendshipMirror("p1", { status: "married" }).status).toBe("pending");
  });
});

describe("arkadaş listesi filtreleme — grup daveti yalnız kabul edilmişleri görür", () => {
  const entries: FriendshipMirror[] = [
    mirror({ pairId: "p1", otherUid: "user-b", otherName: "Bora", status: "accepted", direction: "outgoing" }),
    mirror({ pairId: "p2", otherUid: "user-c", otherName: "Cem", status: "pending", direction: "incoming", createdAt: 30 }),
    mirror({ pairId: "p3", otherUid: "user-d", otherName: "Deniz", status: "pending", direction: "outgoing", createdAt: 10 }),
    mirror({ pairId: "p4", otherUid: "user-e", otherName: "Efe", status: "declined", direction: "incoming" }),
    mirror({ pairId: "p5", otherUid: "user-a", otherName: "Ada", status: "accepted", direction: "incoming" }),
    mirror({ pairId: "p6", otherUid: "", otherName: "Boş", status: "accepted", direction: "outgoing" }),
  ];

  it("acceptedFriends yalnız karşılıklı kabul edilmişleri Türkçe sırayla verir", () => {
    expect(acceptedFriends(entries).map((item) => item.otherUid)).toEqual(["user-a", "user-b"]);
  });

  it("boş otherUid olan bozuk kayıt listeden düşer", () => {
    expect(acceptedFriends(entries).some((item) => item.otherUid === "")).toBe(false);
  });

  it("pending/declined kayıtlar grup seçim listesine SIZMAZ (rıza şartı)", () => {
    const friends = acceptedFriends(entries);
    expect(friends).not.toContainEqual(expect.objectContaining({ status: "pending" }));
    expect(friends).not.toContainEqual(expect.objectContaining({ status: "declined" }));
  });

  it("gelen istekler en yeni önce, giden istekler ayrı listelenir", () => {
    expect(incomingRequests(entries).map((item) => item.pairId)).toEqual(["p2"]);
    expect(outgoingRequests(entries).map((item) => item.pairId)).toEqual(["p3"]);
  });

  it("gelen ve giden listeler kabul edilmiş arkadaşları içermez", () => {
    expect(incomingRequests(entries).some((item) => item.status === "accepted")).toBe(false);
    expect(outgoingRequests(entries).some((item) => item.status === "accepted")).toBe(false);
  });

  it("boş ayna tüm listeleri boş verir", () => {
    expect(acceptedFriends([])).toEqual([]);
    expect(incomingRequests([])).toEqual([]);
    expect(outgoingRequests([])).toEqual([]);
  });
});

describe("mirrorPayload — kural şekliyle uyum", () => {
  it("kuralların hasAll/hasOnly listesini birebir üretir", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    const payload = mirrorPayload("p1", "user-b", "Bora", "incoming", "pending");
    const keys = Object.keys(payload);
    // validFriendshipMirror'ın zorunlu tuttuğu alanlar.
    for (const key of ["pairId", "otherUid", "otherName", "direction", "status", "createdAt", "updatedAt"]) {
      expect(keys).toContain(key);
      expect(rules).toContain(`'${key}'`);
    }
    expect(keys).toHaveLength(7);
    expect(payload.pairId).toBe("p1");
    expect(payload.direction).toBe("incoming");
  });

  it("adı 40 karaktere kırpar (kuralın stringBetween(otherName,0,40) sınırı)", () => {
    const payload = mirrorPayload("p1", "user-b", "x".repeat(80), "incoming", "pending");
    expect((payload.otherName as string)).toHaveLength(40);
  });
});
