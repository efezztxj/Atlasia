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

describe("arkadaşlık kuralları — main'in rıza modeli (fail-closed)", () => {
  const friendships = matchBlock(rules, "match /friendships/{fid} {");
  const requests = matchBlock(rules, "match /users/{uid}/friendRequests/{requesterUid} {");
  const friendIndex = matchBlock(rules, "match /users/{uid}/friends/{friendUid} {");

  it("friendships kökü listelemeye kapalı ve yalnız katılımcılarına açık", () => {
    expect(friendships).toContain("allow list: if false;");
    expect(friendships).toContain("request.auth.uid in resource.data.users");
    // Rıza kaydı sonradan değiştirilemez; geri çekme silme ile olur.
    expect(friendships).toContain("allow update: if false;");
    expect(friendships).toContain("allow delete: if signedIn() && request.auth.uid in resource.data.users;");
  });

  it("kabul, bekleyen isteğin varlığını ve aynı batch'te silinmesini kanıtlar", () => {
    // Kabulü YALNIZ alıcı yazabilir ve gerçek bir bekleyen istek şarttır.
    expect(friendships).toContain("request.resource.data.recipientUid == request.auth.uid");
    expect(friendships).toContain("pendingFriendRequestExists(");
    // Belge kimliği deterministik çift olmalı; aksi hâlde çift kayıt açılırdı.
    expect(friendships).toContain("fid == friendshipId(");
    // Atomiklik: istek aynı batch'te yok olmalı, yoksa tekrar tekrar kabul yazılabilir.
    expect(friendships).toContain(
      "!existsAfter(/databases/$(database)/documents/users/$(request.resource.data.recipientUid)/friendRequests/$(request.resource.data.requesterUid))",
    );
  });

  it("istek own-scoped, 50 ile sınırlı ve karşılıklı tekrara kapalı", () => {
    expect(requests).toContain("uid == request.auth.uid");
    expect(requests).toContain("boundedList(50)");
    expect(requests).toContain("allow update: if false;");
    // Zaten arkadaşlık varsa yeni istek yazılamaz.
    expect(requests).toContain(
      "!exists(/databases/$(database)/documents/friendships/$(friendshipId(uid, requesterUid)))",
    );
    // Karşı taraf da aynı çift için istek gönderdiyse ikinci istek yazılamaz.
    expect(requests).toContain(
      "!exists(/databases/$(database)/documents/users/$(request.auth.uid)/friendRequests/$(uid))",
    );
  });

  it("arkadaş indeksi gerçek kabul edilmiş arkadaşlığa bağlı", () => {
    expect(friendIndex).toContain("isAcceptedFriendship(uid, friendUid)");
    expect(friendIndex).toContain("boundedList(100)");
    expect(friendIndex).toContain("allow update: if false;");
  });
});

describe("grup katılımı — davet ve kod kanıtlı (rızasız ekleme kapalı)", () => {
  const groups = matchBlock(rules, "match /groups/{groupId} {");
  const invites = matchBlock(rules, "match /invites/{invitedUid} {");
  const attempts = matchBlock(rules, "match /joinAttempts/{joinId} {");

  it("davet kabulü yalnız kendi davet belgesinin varlığıyla mümkün", () => {
    expect(groups).toContain(
      "exists(/databases/$(database)/documents/groups/$(groupId)/invites/$(request.auth.uid))",
    );
  });

  it("kodla katılma deneme belgesini, kodu, tavanı ve pencereyi kanıtlar", () => {
    expect(groups).toContain("joinAttempts/$(request.auth.uid)).data.code == resource.data.joinCode");
    expect(groups).toContain(".data.attempts <= 5");
    expect(groups).toContain("duration.value(2, 'm')");
    // Deneme belgesi own-scoped; liste kapalı (kod enumeration'ı yok).
    expect(attempts).toContain("allow get: if signedIn() && joinId == request.auth.uid;");
    expect(attempts).toContain("allow list: if false;");
    // Sayaç sunucu zorunlu: ilk yazım 1, sonra +1; kilit penceresi 15 dk.
    expect(attempts).toContain("request.resource.data.attempts == 1");
    expect(attempts).toContain("request.resource.data.attempts == resource.data.attempts + 1");
    expect(attempts).toContain("resource.data.attempts < 5");
    expect(attempts).toContain("duration.value(15, 'm')");
  });

  it("üye olmayan iki dal da YALNIZ kendini ekler ve 20 tavanını aşamaz", () => {
    const countLines = (needle: string): number =>
      groups.split("\n").filter((line) => line.includes(needle)).length;
    expect(
      countLines("!(request.auth.uid in resource.data.memberUids)"),
      "davet ve kod dalları üye-olmayan durumu ayrıca kanıtlamalı",
    ).toBeGreaterThanOrEqual(2);
    expect(countLines("union([request.auth.uid].toSet())")).toBeGreaterThanOrEqual(2);
    expect(countLines("request.resource.data.memberUids.size() <= 20")).toBeGreaterThanOrEqual(2);
  });

  it("davet yazımı kurucu kimliği ve kabul edilmiş arkadaşlık ister", () => {
    expect(invites).toContain("isAcceptedFriendship(request.auth.uid, invitedUid)");
    expect(invites).toContain(".data.ownerUid == request.auth.uid");
    // Zaten üye olan kişiye davet yazılamaz.
    expect(invites).toContain(".data.memberUids))");
    expect(invites).toContain("allow update: if false;");
  });

  it("grup kökü ve katılma denemeleri listelemeye kapalı", () => {
    expect(groups).toContain("allow list: if false;");
    expect(attempts).toContain("allow list: if false;");
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

  it("kusur #5 sınırı: hikâye listesi resource.data'ya dokunamaz (CI kanıtı)", () => {
    // Firestore list kuralları tek tek belgelere değil, sorgudan türetilen
    // sentetik bir nesneye karşı değerlendiriliyor: eşitlik filtresi
    // kanıtlanabiliyor (routes: visibility == 'public'), createdAt için aralık
    // filtresi kanıtlanamıyor. Emülatör bunu "Property createdAt is undefined
    // on object. for 'list' @ L507" hatasıyla reddetti ve herkese açık hikâye
    // akışı kırıldı (PR #51 CI, 2026-10-22). Pencere bu yüzden yalnız get'te
    // zorunlu; list satırı sadece sayfa sınırını taşır.
    const listLine = stories.split("\n").find((line) => line.includes("allow list")) ?? "";
    expect(listLine).toContain("boundedList(50)");
    expect(listLine).not.toContain("resource.data");
    expect(stories).toMatch(/allow get: if storyLive\(\)/);
  });

  it("sertleştirmeler gevşetme içermez: catch-all ve list:false yerinde", () => {
    expect(rules).toContain("match /{document=**} {");
    expect(rules).toContain("allow read, write: if false;");
    expect(rules).toContain("allow list: if false;");
  });
});
