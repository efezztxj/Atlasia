/**
 * firestore.rules statik yapı kilidi — Java/emülatör GEREKTİRMEZ.
 *
 * Emülatör süiti yalnız CI'da koşuyor (yerelde Java 21 yok). Bu dosya, kural
 * dosyasındaki sertleştirmelerin sessizce geri alınmamasını metin düzeyinde
 * kilitler. Her iddia doğrudan `firestore.rules` metninden okunur; davranış
 * testi değil, "gevşeme yok" bekçisidir.
 *
 * Kaynak PR'lar: #51 (grup/silinmiş grup/rıza/hikâye), #55 (ret kanıtı,
 * displayNameLower, doğrulama okuması).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rules = readFileSync("firestore.rules", "utf8");

/** Yorumları ve girinti farklarını ayıklar; iddialar biçimden bağımsız olsun. */
function normalize(source: string): string {
  return source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

const flat = normalize(rules);

/** `match <yol> { ... }` bloğunu küme parantezi sayarak çıkarır (iç içe match'ler dahil). */
function matcher(path: string): string {
  const marker = `match ${path} {`;
  const start = flat.indexOf(marker);
  if (start < 0) throw new Error(`matcher bulunamadı: ${path}`);
  let depth = 0;
  for (let index = start + marker.length - 1; index < flat.length; index += 1) {
    const char = flat[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return flat.slice(start, index + 1);
    }
  }
  throw new Error(`matcher kapanmadı: ${path}`);
}

describe("firestore.rules — fail-closed taban", () => {
  it("tanımsız koleksiyonlar için catch-all kapalıdır ve tek kuralı vardır", () => {
    const catchAll = flat.slice(flat.indexOf("match /{document=**}"));
    expect(catchAll).toContain("allow read, write: if false;");
    expect(catchAll.match(/allow /g)).toHaveLength(1);
    expect(flat).not.toContain("allow read, write: if true");
  });

  it("`if true` yalnız places ve posts okumasında kalır (yeni gevşeme yok)", () => {
    const permissive = flat.match(/allow [a-z, ]+: if true;/g) ?? [];
    expect(permissive).toHaveLength(2);

    const places = matcher("/places/{placeId}");
    const posts = matcher("/posts/{postId}");
    const inAllowedBlocks = (places.match(/allow [a-z, ]+: if true;/g) ?? []).length
      + (posts.match(/allow [a-z, ]+: if true;/g) ?? []).length;
    // Toplam 2 ve ikisi de izinli bloklarda → başka hiçbir yerde `if true` yok.
    expect(inAllowedBlocks).toBe(2);
  });
});

describe("firestore.rules — #51 sertleştirmeleri", () => {
  it("groups: son mesaj dalı updatedAt'i doğrular (hasOnly değeri kısıtlamaz)", () => {
    const groups = matcher("/groups/{groupId}");
    expect(groups).toContain("affectedKeys().hasOnly(['lastMessage', 'updatedAt'])");
    expect(groups).toContain("request.resource.data.updatedAt == request.time");
  });

  it("groups: kendini çıkarma dalı updatedAt'i doğrular", () => {
    const groups = matcher("/groups/{groupId}");
    expect(groups).toContain("affectedKeys().hasOnly(['memberUids', 'updatedAt'])");
    expect(groups).toContain("memberUids.toSet().difference([request.auth.uid].toSet())");
  });

  it("groups: kuruluşta üye listesi tam olarak kurucudur (rızasız üye yok)", () => {
    const groups = matcher("/groups/{groupId}");
    expect(groups).toContain("request.resource.data.memberUids.hasOnly([request.auth.uid])");
  });

  it("grup mesajı: silinmiş grupta exists koruması vardır (null okuma yok)", () => {
    // `messages` grupların içinde yuvalanmış matcher'dır.
    const messages = matcher("/messages/{messageId}");
    expect(messages).toContain("function groupMembers() { return exists(");
    expect(messages).toContain("? get(/databases/$(database)/documents/groups/$(groupId)).data.memberUids : [];");
  });

  it("users/{uid}/groups indeksi gerçek üyelik ve rol kanıtı ister", () => {
    const index = matcher("/users/{uid}/groups/{groupId}");
    expect(index).toContain("exists(/databases/$(database)/documents/groups/$(groupId))");
    expect(index).toContain("request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.memberUids");
    expect(index).toContain("request.resource.data.role == 'owner'");
    expect(index).toContain("data.ownerUid == request.auth.uid");
  });

  it("stories: 24 saat penceresi kuralda ve liste resource.data'ya bağlanmaz", () => {
    const stories = matcher("/stories/{storyId}");
    expect(stories).toContain("function storyLive() { return resource.data.createdAt >= request.time - duration.value(24, 'h'); }");
    expect(stories).toContain("allow get: if storyLive()");
    expect(stories).toContain("allow list: if boundedList(50);");
    // Kanıt (CI #51): aralık filtresi `list` kuralında kanıtlanamıyor; tekrar
    // eklenirse hikâye akışı kırılır.
    expect(stories).not.toMatch(/allow list: if [^;]*resource\.data/);
  });
});

describe("firestore.rules — #55 kilidi", () => {
  it("verifications okuması giriş şartına bağlıdır (anonime açılmaz)", () => {
    const verifications = matcher("/verifications/{verificationId}");
    expect(verifications).toContain("allow get: if signedIn();");
    expect(verifications).toContain("allow list: if signedIn() && boundedList(50);");
    expect(verifications).not.toContain("if true");
  });

  it("friend_declined bildirimi kanıt olmadan yazılamaz", () => {
    const notifications = matcher("/users/{uid}/notifications/{notificationId}");
    expect(notifications).toContain("friendDeclineProof(request.resource.data)");
    expect(flat).toContain("function friendDeclineProof(data) {");
    expect(flat).toContain("get(/databases/$(database)/documents/friendDeclines/$(data.targetId)).data.declinerUid == data.actorUid");
  });

  it("friendDeclines listesi kapalı, create batch kanıtı ister, update kapalı", () => {
    const declines = matcher("/friendDeclines/{fid}");
    expect(declines).toContain("allow list: if false;");
    expect(declines).toContain("allow update: if false;");
    expect(declines).toContain("!existsAfter(/databases/$(database)/documents/users/$(request.resource.data.declinerUid)/friendRequests/$(request.resource.data.requesterUid))");
    expect(declines).toContain("fid == friendshipId(request.resource.data.declinerUid, request.resource.data.requesterUid)");
  });

  it("userProfiles: displayNameLower zorunlu ve biçimi denetlenir; sunucuda lower() yok", () => {
    expect(flat).toContain("data.keys().hasAll(['uid', 'displayName', 'displayNameLower', 'createdAt', 'updatedAt'])");
    expect(flat).toContain("data.displayNameLower.matches('[a-z0-9 ığüşöçâîû-]+')");
    expect(flat).toContain("stringBetween(data.displayNameLower, 2, 40)");
    // Türkçe İ ayrışması: normalizasyon istemcide; kural yalnız biçim doğrular.
    expect(flat).not.toContain(".lower()");
  });
});
