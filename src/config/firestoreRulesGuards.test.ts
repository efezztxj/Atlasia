import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Kural GEVŞETME kilidi (D6.4) — emülatör gerektirmez.
 *
 * `tests/firestore.rules.test.ts` kuralların DAVRANIŞINI emülatörde doğrular, ama
 * bu ortamda/lokal makinede Java 21 yoksa hiç koşmaz. Bu dosya onun yerine
 * geçmez; yalnız *metin düzeyinde* iki şeyi garanti eder:
 *   1. Kimse sessizce yeni bir `allow …: if true` ekleyemez (gevşeme),
 *   2. Teslim edilen yollar (friendRequests/friends/friendships/userProfiles …)
 *      kuraldan kazara silinemez.
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
  it("`if true` yalnız 4 yerde ve yalnız `get` (tekil okuma) izni olarak kalır", () => {
    const permissive = lines
      .map((line, index) => ({ line: line.trim(), index: index + 1 }))
      .filter((entry) => /^allow\s+\w+\s*:\s*if true\s*;/.test(entry.line));

    expect(permissive.map((entry) => entry.line)).toEqual([
      "allow get: if true;",
      "allow get: if true;",
      "allow get: if true;",
      "allow get: if true;",
    ]);
    // Yeni bir `true` eklenirse burada durur; gerekçesi ve testi olmadan geçemez.
    expect(permissive).toHaveLength(4);
  });

  it("`allow write` kısaltması yok: her izin ayrı ayrı denetlenebilir olmalı", () => {
    expect(rules).not.toMatch(/allow\s+write/);
  });

  it("sunucu tarafında `lower()` yok: Türkçe İ/i ayrışması istemcide çözülür", () => {
    expect(rules).not.toContain("lower(");
  });

  it("varsayılan kural kapalı: tanımsız koleksiyon her zaman reddedilir", () => {
    const fallback = block("match /{document=**}");
    expect(fallback).toContain("allow read, write: if false");
  });
});

describe("firestore.rules — teslim edilen sözleşme yolları (p4–p9, p15–p17)", () => {
  const required = [
    "match /users/{uid}/friendRequests/{requesterUid}",
    "match /users/{uid}/friends/{friendUid}",
    "match /friendships/{fid}",
    "match /userProfiles/{uid}",
    "match /users/{uid}/notifications/{notificationId}",
    "match /users/{uid}/groups/{groupId}",
    "match /invites/{invitedUid}",
    "match /joinAttempts/{joinId}",
  ];

  it.each(required)("%s bloğu mevcut", (marker) => {
    expect(rules).toContain(marker);
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
  });
});

describe("firestore.rules — notificationProof", () => {
  const proof = block("function notificationProof");

  it.each(["friend_request", "friend_accepted", "group_invite", "group_message", "report_received"])(
    "%s tipi bir kanıt belgesine bağlı",
    (type) => {
      expect(proof).toContain(`'${type}'`);
    },
  );

  it.each(["system", "blocked", "report_actioned", "friend_declined"])(
    "%s tipi istemciye kapalı (kanıtsız yazılamaz)",
    (type) => {
      expect(proof).not.toContain(`'${type}'`);
    },
  );
});
