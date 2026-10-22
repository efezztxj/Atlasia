/**
 * Atlasia — firestore.rules yapısal bütünlük testi (emülatör GEREKTİRMEZ).
 *
 * Neden var: gerçek kural semantiği `npm run test:rules:emulator` ile Firestore
 * Emulator üzerinde koşar ve Java 21 ister. Bu sandbox'ta Java YOK
 * (`java: command not found`, `apt-get` openjdk-21 paketini bulamıyor), yani
 * emülatör turu ÇALIŞTIRILAMADI. Bu test semantiğin yerini TUTMAZ; yalnızca
 * dosyanın yapısal olarak bozulmadığını ve yeni koleksiyonların fail-closed
 * kaldığını doğrular. Semantik kanıt CI'daki emülatör turundadır.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rules = readFileSync("firestore.rules", "utf8");

/** Yorum ve metin içindekileri saymadan süslü parantez dengesi. */
function braceBalance(source: string): number {
  let depth = 0;
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    // Satır yorumu
    if (char === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    // Blok yorumu
    if (char === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    // Metin dizisi (tek tırnak)
    if (char === "'") {
      index += 1;
      while (index < source.length && source[index] !== "'") {
        if (source[index] === "\\") index += 1;
        index += 1;
      }
      index += 1;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    // Denge hiç negatife düşmemeli: kapanış açılıştan önce gelirse dosya bozuktur.
    if (depth < 0) return depth;
    index += 1;
  }
  return depth;
}

/**
 * Bir match bloğunun gövdesini (açılış `{` ile eşleşen `}` arası) çıkarır.
 *
 * İNCE NOKTA: `header` zaten " {" ile BİTER, yani açılış süslü parantezi
 * header'ın son karakteridir. Header'ın ötesinde yeni bir `{` aramak bloğun
 * içindeki ilk `function … {` parantezini bulur ve gövde yerine yalnız o
 * fonksiyonun içi döner. Bu yüzden tarama header'ın son karakterinden başlar.
 */
function matchBlock(source: string, header: string): string {
  const start = source.indexOf(header);
  expect(start, `${header} bloğu bulunamadı`).toBeGreaterThanOrEqual(0);
  const open = source.indexOf("{", start + header.length - 1);
  expect(open, `${header} açılış parantezi bulunamadı`).toBe(start + header.length - 1);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  throw new Error(`${header} bloğu kapanmıyor`);
}

describe("firestore.rules yapısal bütünlük", () => {
  it("süslü parantezler dengeli (yorum ve metinler sayılmadan)", () => {
    expect(braceBalance(rules)).toBe(0);
  });

  it("rules_version ve service/match iskeleti korunuyor", () => {
    expect(rules.startsWith("rules_version = '2';")).toBe(true);
    expect(rules).toContain("service cloud.firestore {");
    expect(rules).toContain("match /databases/{database}/documents {");
  });

  it("fail-closed catch-all dosyanın SON kuralı olarak duruyor", () => {
    const catchAll = rules.indexOf("match /{document=**} {");
    expect(catchAll).toBeGreaterThan(0);
    const tail = rules.slice(catchAll);
    expect(tail).toContain("allow read, write: if false;");
    // catch-all'dan sonra başka bir allow kuralı gelmemeli.
    expect(tail.slice(tail.indexOf("allow read, write: if false;"))).not.toMatch(/allow\s+(get|list|create|update|delete|read|write)\s*:.*if\s+(?!false)/);
  });

  it("dosyada hiçbir yerde koşulsuz 'allow ... : if true' yazım izni yok", () => {
    // Okuma için `allow get: if true` meşru (places/posts herkese açık);
    // ama YAZIM hiçbir koşulda true olamaz.
    expect(rules).not.toMatch(/allow\s+(?:create|update|delete|write)[^:]*:\s*if\s+true/);
  });
});

describe("arkadaşlık kuralları — fail-closed yapı", () => {
  it("friendships bloğu var, listesi kapalı (enumeration yok)", () => {
    const block = matchBlock(rules, "match /friendships/{pairId} {");
    expect(block).toContain("allow get: if signedIn() && request.auth.uid in resource.data.participants;");
    expect(block).toContain("allow list: if false;");
    expect(block).not.toMatch(/allow\s+list\s*:[^;]*if\s+true/);
  });

  it("istek oluşturma yalnız isteyene açık ve engelleme kontrolü yapıyor", () => {
    const block = matchBlock(rules, "match /friendships/{pairId} {");
    expect(block).toContain("request.resource.data.requesterUid == request.auth.uid");
    expect(block).toContain("request.resource.data.recipientUid != request.auth.uid");
    expect(block).toContain("request.resource.data.status == 'pending'");
    expect(block).toContain("pairId == sortedPairId(");
    expect(block).toContain("!hasBlocked(request.resource.data.recipientUid, request.resource.data.requesterUid)");
    expect(block).toContain("!hasBlocked(request.resource.data.requesterUid, request.resource.data.recipientUid)");
    expect(block).toContain("validFriendshipShape(request.resource.data)");
  });

  it("kabulü YALNIZ alıcı verebilir; isteyen kendi isteğini kabul edemez", () => {
    const block = matchBlock(rules, "match /friendships/{pairId} {");
    // update dalı alıcıya kilitli ve yalnız pending'den geçer.
    expect(block).toMatch(/allow update: if signedIn\(\)\s*\n\s*\/\/[^\n]*\n\s*&& resource\.data\.recipientUid == request\.auth\.uid/);
    expect(block).toContain("resource.data.status == 'pending'");
    expect(block).toContain("request.resource.data.status in ['accepted', 'declined']");
    // Kimlik ve taraf alanları değiştirilemez.
    expect(block).toContain("request.resource.data.participants == resource.data.participants");
    expect(block).toContain("request.resource.data.requesterUid == resource.data.requesterUid");
    expect(block).toContain("request.resource.data.createdAt == resource.data.createdAt");
    expect(block).toContain(".hasOnly(['status', 'recipientName', 'acceptedAt', 'updatedAt'])");
  });

  it("silme iki tarafa açık (geri çekme / arkadaşlıktan çıkma)", () => {
    const block = matchBlock(rules, "match /friendships/{pairId} {");
    expect(block).toContain("allow delete: if signedIn() && request.auth.uid in resource.data.participants;");
  });

  it("own-scoped ayna: okuma sahibine, liste 50 ile sınırlı", () => {
    const block = matchBlock(rules, "match /users/{uid}/friendships/{pairId} {");
    expect(block).toContain("allow get: if signedIn() && uid == request.auth.uid;");
    expect(block).toContain("allow list: if signedIn() && uid == request.auth.uid && boundedList(50);");
  });

  it("çapraz ayna yazımı rıza kaydının varlığına ve taraflığına bağlı", () => {
    const block = matchBlock(rules, "match /users/{uid}/friendships/{pairId} {");
    expect(block).toContain("existsAfter(/databases/$(database)/documents/friendships/$(pairId))");
    expect(block).toContain("request.auth.uid in friendshipAfter().participants");
    expect(block).toContain("uid in friendshipAfter().participants");
    expect(block).toContain("request.resource.data.status == friendshipAfter().status");
    // Yön ve karşı taraf kimliği rıza kaydından türetilmeli; sahte ayna yazılamaz.
    expect(block).toContain("friendshipAfter().requesterUid == uid ? 'outgoing' : 'incoming'");
    expect(block).toContain("validFriendshipMirror(request.resource.data, pairId)");
  });

  it("ayna güncellemesi rızanın ÖNÜNE geçemez (status kayda eşitlenir)", () => {
    const block = matchBlock(rules, "match /users/{uid}/friendships/{pairId} {");
    expect(block).toContain("request.resource.data.status == friendshipAfter().status");
    expect(block).toContain("request.resource.data.otherUid == resource.data.otherUid");
    expect(block).toContain("request.resource.data.direction == resource.data.direction");
    expect(block).toContain(".hasOnly(['status', 'otherName', 'updatedAt'])");
  });

  it("ayna silme: kendi kaydı her zaman, rıza kalktıysa karşı taraf da", () => {
    const block = matchBlock(rules, "match /users/{uid}/friendships/{pairId} {");
    expect(block).toContain("uid == request.auth.uid");
    expect(block).toContain("!existsAfter(/databases/$(database)/documents/friendships/$(pairId))");
  });

  it("katılımcı listesi sıralı çift zorunlu (çift pairId üretimi engellenir)", () => {
    expect(rules).toContain("data.participants[0] < data.participants[1]");
    expect(rules).toContain("data.participants.size() == 2");
  });

  it("isAcceptedFriendWith getAfter ile accepted durumunu kanıtlar", () => {
    expect(rules).toContain("function isAcceptedFriendWith(a, b)");
    expect(rules).toMatch(/getAfter\(friendshipPathFor\(a, b\)\)\.data\.status == 'accepted'/);
    expect(rules).toContain("exists(friendshipPathFor(a, b))");
  });
});

describe("grup daveti — rızasız doğrudan ekleme kapalı", () => {
  it("friendInviteSelfAdd yalnız kendini eklemeye izin verir", () => {
    const block = matchBlock(rules, "match /groups/{groupId} {");
    expect(block).toContain("function friendInviteSelfAdd()");
    expect(block).toContain("!(request.auth.uid in resource.data.memberUids)");
    expect(block).toContain(".hasOnly(['memberUids', 'updatedAt'])");
    expect(block).toContain("request.resource.data.memberUids.toSet() == resource.data.memberUids.toSet().union([request.auth.uid].toSet())");
    expect(block).toContain("isAcceptedFriendWith(request.auth.uid, resource.data.ownerUid)");
  });

  it("self-add dalı adı, sahibi ve oluşturma anını değiştiremez", () => {
    const block = matchBlock(rules, "match /groups/{groupId} {");
    expect(block).toContain("request.resource.data.name == resource.data.name");
    expect(block).toContain("request.resource.data.ownerUid == resource.data.ownerUid");
    expect(block).toContain("request.resource.data.createdAt == resource.data.createdAt");
    expect(block).toContain("request.resource.data.updatedAt == request.time");
  });

  it("self-add dalı 20 üye tavanını aşamaz", () => {
    const block = matchBlock(rules, "match /groups/{groupId} {");
    expect(block).toContain("request.resource.data.memberUids.size() <= 20");
  });

  it("update kuralı üye ve üye-olmayan dallarını ayırıyor", () => {
    const block = matchBlock(rules, "match /groups/{groupId} {");
    expect(block).toContain("request.auth.uid in resource.data.memberUids");
    expect(block).toContain("|| friendInviteSelfAdd()");
  });

  it("grup listesi hâlâ kapalı (koleksiyon taraması yok)", () => {
    const block = matchBlock(rules, "match /groups/{groupId} {");
    expect(block).toContain("allow list: if false;");
  });
});

describe("bildirim tipleri — istemci ve kural listesi eşleşiyor", () => {
  it("friend_request ve friend_accepted her iki tarafta da tanımlı", () => {
    expect(rules).toContain("'friend_request'");
    expect(rules).toContain("'friend_accepted'");
    const notifications = readFileSync("src/lib/notifications.ts", "utf8");
    expect(notifications).toContain('"friend_request"');
    expect(notifications).toContain('"friend_accepted"');
  });

  it("kuraldaki tip listesi ile NotificationType birebir aynı küme", () => {
    const ruleMatch = rules.match(/data\.type in \[([^\]]+)\]/);
    expect(ruleMatch).not.toBeNull();
    const ruleTypes = ruleMatch![1].split(",").map((item) => item.trim().replace(/'/g, "")).sort();

    const source = readFileSync("src/lib/notifications.ts", "utf8");
    const typeBlock = source.match(/export type NotificationType =([\s\S]*?);/);
    expect(typeBlock).not.toBeNull();
    const clientTypes = [...typeBlock![1].matchAll(/"([a-z_]+)"/g)].map((item) => item[1]).sort();

    expect(clientTypes).toEqual(ruleTypes);
  });
});

describe("kural sertleştirmeleri — regresyon kilitleri (2026-10-22 denetimi)", () => {
  const groups = matchBlock(rules, "match /groups/{groupId} {");
  const stories = matchBlock(rules, "match /stories/{storyId} {");
  const userGroups = matchBlock(rules, "match /users/{uid}/groups/{groupId} {");

  it("kusur #4: grup kuruluşu yalnız kurucu üyeyle mümkün", () => {
    // Rızasız doğrudan ekleme: create anında memberUids tam olarak [kurucu].
    expect(groups).toContain("request.resource.data.memberUids.hasOnly([request.auth.uid])");
  });

  it("kusur #1: groups update'in üç dalı da updatedAt'i doğrular", () => {
    // lastMessage + kendini-çıkarma + friendInviteSelfAdd = 3 dal.
    const count = (groups.match(/request\.resource\.data\.updatedAt == request\.time/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("kusur #3: groupMembers silinmiş grupta null .data'ya düşmez", () => {
    const fn = groups.slice(groups.indexOf("function groupMembers()"));
    const body = fn.slice(0, fn.indexOf("allow get"));
    expect(body).toContain("exists(/databases/$(database)/documents/groups/$(groupId))");
    expect(body).toContain(": []");
  });

  it("kusur #2: grup indeksi gerçek üyelik ve rol tutarlılığı ister", () => {
    expect(userGroups).toContain("request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.memberUids");
    expect(userGroups).toContain("(request.resource.data.role == 'owner')");
  });

  it("kusur #5: hikâyelerde 24 saat penceresi kural tarafında zorunlu", () => {
    expect(stories).toContain("duration.value(24, 'h')");
    // Eskiden herkese açık olan 'allow get: if true' artık yok.
    expect(stories).not.toContain("allow get: if true;");
    expect(stories).toContain("function storyLive()");
  });

  it("sertleştirmeler gevşetme içermez: catch-all ve list:false yerinde", () => {
    expect(rules).toContain("match /{document=**} {");
    expect(rules).toContain("allow read, write: if false;");
    expect(rules).toContain("allow list: if false;");
  });
});
