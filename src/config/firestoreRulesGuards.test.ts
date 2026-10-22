import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Kural GEVŞETME kilidi (#61 D6'dan uyarlandı) — emülatör gerektirmez.
 *
 * `tests/firestore.rules.test.ts` kuralların DAVRANIŞINI emülatörde doğrular, ama
 * Java/emülatör yoksa hiç koşmaz. Bu dosya onun yerine geçmez; yalnız
 * *metin düzeyinde* iki şeyi garanti eder:
 *   1. Kimse sessizce yeni bir `allow …: if true` ekleyemez (gevşeme),
 *   2. Teslim edilen sözleşme yolları ve kanıt kapıları kuraldan kazara
 *      silinemez/gevşetilemez.
 * Davranış kanıtı hâlâ CI'daki emülatör testleridir.
 */
const rules = readFileSync("firestore.rules", "utf8");
const lines = rules.split("\n");

function block(startMarker: string): string {
  const start = rules.indexOf(startMarker);
  if (start < 0) return "";
  const end = rules.indexOf("\n    }", start);
  return rules.slice(start, end < 0 ? rules.length : end);
}

describe("firestore.rules — gevşeme kilidi", () => {
  it("`if true` yalnız 2 yerde ve yalnız `get` (tekil okuma) izni olarak kalır: places, posts", () => {
    const permissive = lines
      .map((line) => line.trim())
      .filter((line) => /^allow\s+\w+\s*:\s*if true\s*;/.test(line));

    expect(permissive).toEqual([
      "allow get: if true;",
      "allow get: if true;",
    ]);
    // Sayaç geçmişi: #55 öncesi 4 → #55 (verifications) 3 → #62 (stories) 2.
    // Yeni bir `true` eklenirse burada durur; gerekçesi ve testi olmadan geçemez.
    expect(permissive).toHaveLength(2);
  });

  it("`allow write` kısaltması yok: her izin ayrı ayrı denetlenebilir olmalı", () => {
    expect(rules).not.toMatch(/allow\s+write/);
  });

  it("sunucu tarafında `lower()` yok: Türkçe İ/i ayrışması istemcide çözülür", () => {
    // Yorum satırları hariç (kuralın kendi açıklaması "lower() YOK" der).
    const code = lines.filter((line) => !line.trim().startsWith("//")).join("\n");
    expect(code).not.toContain("lower(");
  });

  it("varsayılan kural kapalı: tanımsız koleksiyon her zaman reddedilir", () => {
    const fallback = block("match /{document=**}");
    expect(fallback).toContain("allow read, write: if false");
  });
});

describe("firestore.rules — teslim edilen sözleşme yolları", () => {
  const required = [
    "match /users/{uid}/friendRequests/{requesterUid}",
    "match /users/{uid}/friends/{friendUid}",
    "match /users/{uid}/following/{targetUid}",
    "match /friendships/{fid}",
    "match /friendDeclines/{fid}",
    "match /userProfiles/{uid}",
    "match /users/{uid}/notifications/{notificationId}",
    "match /users/{uid}/groups/{groupId}",
    "match /invites/{invitedUid}",
    "match /joinAttempts/{joinId}",
  ];

  it.each(required)("%s bloğu mevcut", (marker) => {
    expect(rules).toContain(marker);
  });

  it("verifications (serbest metin notu) anonim okumaya kapalı ve kimlik {placeId}_{uid} bağlı", () => {
    const verifications = block("match /verifications/{verificationId}");
    expect(verifications).toContain("allow get: if signedIn();");
    expect(verifications).toContain("allow list: if signedIn() && boundedList(50);");
    expect(verifications).toContain('verificationId == request.resource.data.placeId + "_" + request.resource.data.uid');
    expect(verifications).not.toContain("if true");
  });

  it("arkadaşlık isteği yalnız kendi kuyruğunu okutur, alıcının kuyruğunu okutmaz", () => {
    const friendRequests = block("match /users/{uid}/friendRequests/{requesterUid}");
    expect(friendRequests).toContain("allow get: if signedIn() && uid == request.auth.uid");
    expect(friendRequests).toContain("allow list: if signedIn() && uid == request.auth.uid");
    expect(friendRequests).toContain("allow update: if false");
  });

  it("arkadaşlık indeksi kabul edilmiş friendship kanıtı olmadan yazılamaz", () => {
    const friends = block("match /users/{uid}/friends/{friendUid}");
    expect(friends).toContain("isAcceptedFriendship(uid, friendUid)");
  });

  it("friendships yalnız bekleyen istek batch'i içinde oluşur", () => {
    const friendships = block("match /friendships/{fid}");
    expect(friendships).toContain("existsAfter(");
    expect(friendships).toContain("pendingFriendRequestExists(");
  });

  it("takip: yalnız sahibi yazar, kendini takip edemez, güncelleme yok", () => {
    const following = block("match /users/{uid}/following/{targetUid}");
    expect(following).toContain("uid == request.auth.uid");
    expect(following).toContain("uid != targetUid");
    expect(following).toContain("validFollow(request.resource.data, uid, targetUid)");
    expect(following).toContain("allow update: if false");
  });

  it("validFollow alanları kapalı tutar ve followerUid'yi oturuma bağlar", () => {
    const validFollow = block("function validFollow");
    expect(validFollow).toContain("hasOnly(['followerUid', 'targetUid', 'createdAt'])");
    expect(validFollow).toContain("data.followerUid == request.auth.uid");
    expect(validFollow).toContain("data.followerUid != data.targetUid");
    expect(validFollow).toContain("data.createdAt == request.time");
  });
});

describe("firestore.rules — notificationProof + friendDeclineProof", () => {
  const proof = block("function notificationProof");

  it.each(["friend_request", "friend_accepted", "group_invite", "group_message", "report_received"])(
    "%s tipi bir kanıt belgesine bağlı",
    (type) => {
      expect(proof).toContain(`'${type}'`);
    },
  );

  it.each(["system", "blocked", "report_actioned"])(
    "%s tipi istemciye kapalı (kanıtsız yazılamaz)",
    (type) => {
      expect(proof).not.toContain(`'${type}'`);
    },
  );

  it("friend_declined kanıtı ayrı kilit olan friendDeclineProof'ta kalır", () => {
    const decline = block("function friendDeclineProof");
    expect(decline).toContain("data.type != 'friend_declined'");
    expect(decline).toContain("documents/friendDeclines/$(data.targetId)");
  });

  it("bildirim create kapısı iki kanıtı birlikte zorunlu tutar", () => {
    const notifications = block("match /users/{uid}/notifications/{notificationId}");
    expect(notifications).toContain("notificationProof(request.resource.data)");
    expect(notifications).toContain("friendDeclineProof(request.resource.data)");
  });
});

describe("firestore.rules — userProfiles oluşturma/güncelleme ayrımı", () => {
  it("güncelleme createdAt'i resource'a bağlar, request.time istemez (eski çelişki kapalı)", () => {
    const update = block("function validUserProfileUpdate");
    expect(update).toContain("data.createdAt == resource.data.createdAt");
    expect(update).not.toContain("data.createdAt == request.time");

    const create = block("function validUserProfileCreate");
    expect(create).toContain("data.createdAt == request.time");
  });

  it("match bloğu create/update için ayrı doğrulayıcılar kullanır", () => {
    const profiles = block("match /userProfiles/{uid}");
    expect(profiles).toContain("validUserProfileCreate(request.resource.data, uid)");
    expect(profiles).toContain("validUserProfileUpdate(request.resource.data, uid)");
    expect(profiles).toContain("resource.data.uid == request.auth.uid");
  });

  it("displayNameLower biçim kilidi yerinde (istemci aynasıyla aynı küme)", () => {
    expect(rules).toContain("data.displayNameLower.matches('[a-z0-9 ığüşöçâîû-]+')");
  });
});
