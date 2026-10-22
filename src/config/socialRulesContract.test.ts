/**
 * İŞ 1 — sosyal yüzeyin **statik** kural sözleşmesi.
 *
 * Emülatör testleri (tests/firestore.rules.test.ts) davranışı kanıtlar; bu dosya
 * ise sözleşmenin sessizce kaybolmasını engeller: kimlik bağı, takip kuralı ve
 * "gevşeme yok" sayacı. Java gerektirmez, her koşuda çalışır.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rules = readFileSync(fileURLToPath(new URL("../../firestore.rules", import.meta.url)), "utf8");

function block(marker: string): string {
  const start = rules.indexOf(marker);
  if (start < 0) throw new Error(`Kural bloğu yok: ${marker}`);
  // Seçicide süslü parantez olabilir (ör. /{path=**}/): gövde, seçiciden SONRA açılır.
  const open = rules.indexOf("{", start + marker.length);
  let depth = 0;
  for (let i = open; i < rules.length; i += 1) {
    if (rules[i] === "{") depth += 1;
    else if (rules[i] === "}") {
      depth -= 1;
      if (depth === 0) return rules.slice(open + 1, i);
    }
  }
  throw new Error(`Kural bloğu kapanmadı: ${marker}`);
}

const allowTrue = [...rules.matchAll(/allow\s+[a-z,\s]+:\s*if\s+true/g)];

describe("gevşeme yok", () => {
  it("`allow … if true` sayısı 2'yi geçmez (yalnız places get ve posts get)", () => {
    // #55 öncesi 4 idi; stories get ve verifications get sıkılaştırıldı.
    expect(allowTrue).toHaveLength(2);
    const lines = rules
      .split("\n")
      .map((line, index) => ({ line: line.trim(), index: index + 1 }))
      .filter((entry) => /allow\s+[a-z,\s]+:\s*if\s+true/.test(entry.line));
    expect(lines.map((entry) => entry.line)).toEqual(["allow get: if true;", "allow get: if true;"]);
    // Bu iki satırın hangi bloklarda olduğunu da kilitleyelim.
    for (const { index } of lines) {
      const before = rules.slice(0, rules.split("\n").slice(0, index).join("\n").length);
      expect(before).toMatch(/match \/(places|posts)\/\{[a-zA-Z]+\}/);
    }
  });

  it("doğrulama ve takip bloklarında anonim okuma/yazma yok", () => {
    for (const marker of ["match /verifications/{verificationId}", "match /users/{uid}/following/{targetUid}"]) {
      const body = block(marker);
      expect(body).not.toContain(": if true");
    }
  });
});

describe("doğrulama kimliği {placeId}_{uid}", () => {
  it("create kuralı kimliği yer + kişiye bağlar", () => {
    const body = block("match /verifications/{verificationId}");
    expect(body).toContain(
      'verificationId == request.resource.data.placeId + "_" + request.resource.data.uid',
    );
    expect(body).toContain("validVerification(request.resource.data)");
    expect(body).toContain("allow list: if signedIn() && boundedList(50);");
  });

  it("güncelleme yalnız sahibine ve yeri/sahibi değiştirmeden açılır", () => {
    const body = block("match /verifications/{verificationId}");
    // Sahip kilidi: başkasının belgesi güncellenemez.
    expect(body).toContain("resource.data.uid == request.auth.uid");
    // Yer ve sahip güncellemede sabit: aynı kişi aynı yerin kimliğini başka yere taşıyamaz.
    expect(body).toContain("request.resource.data.placeId == resource.data.placeId");
    expect(body).toContain("request.resource.data.uid == resource.data.uid");
    expect(body.indexOf("allow update:")).toBeGreaterThan(0);
    expect(body).not.toContain("allow update: if true");
  });

  it("silme yalnız belgenin sahibine açık", () => {
    const body = block("match /verifications/{verificationId}");
    expect(body).toContain("allow delete: if signedIn() && resource.data.uid == request.auth.uid;");
  });
});

describe("takip kuralı", () => {
  it("yalnız sahibi yazar, kendini takip edemez, şema dar", () => {
    const body = block("match /users/{uid}/following/{targetUid}");
    expect(body).toContain("allow get: if signedIn() && uid == request.auth.uid;");
    expect(body).toContain("allow list: if signedIn() && uid == request.auth.uid && boundedList(100);");
    expect(body).toContain("uid != targetUid");
    expect(body).toContain("validFollow(request.resource.data, uid, targetUid)");
    expect(body).toContain("allow update: if false;");
    expect(body).toContain("allow delete: if signedIn() && uid == request.auth.uid;");
  });

  it("takip şeması dar: yalnız followerUid, targetUid, createdAt", () => {
    const shape = rules.slice(rules.indexOf("function validFollow"), rules.indexOf("function friendshipId"));
    expect(shape).toContain("hasOnly(['followerUid', 'targetUid', 'createdAt'])");
    expect(shape).toContain("data.followerUid == request.auth.uid");
    expect(shape).toContain("data.followerUid != data.targetUid");
    expect(shape).toContain("data.createdAt == request.time");
  });

  it("takipçi listesi diye bir okuma yolu yok (collection-group bloğu yok)", () => {
    // Bilinçli karar: birinin kimi takip ettiği yalnız sahibine açık kalır.
    expect(rules).not.toContain("/{path=**}/following");
  });
});
