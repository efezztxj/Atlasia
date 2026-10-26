import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { describeCondition, parseRules, summarize, toMarkdown } from "./rules-inventory.mjs";

const rulesPath = fileURLToPath(new URL("../firestore.rules", import.meta.url));
const source = readFileSync(rulesPath, "utf8");

describe("rules-inventory — ayrıştırıcı", () => {
  it("küçük bir kural metnini blok/blok izler", () => {
    const mini = [
      "service cloud.firestore {",
      "  match /databases/{database}/documents {",
      "    match /a/{id} {",
      "      allow get: if true;",
      "      allow write: if request.auth != null",
      "                    && request.auth.uid == id;",
      "      match /b/{subId} {",
      "        allow list: if request.auth != null && boundedList(10);",
      "      }",
      "    }",
      "  }",
      "}",
    ].join("\n");

    const blocks = parseRules(mini);
    assert.equal(blocks.length, 3);
    // Satır sırasına göre: kök sarmalayıcı en üstte, iç içe blok en sonda.
    // `path` seçicinin kendisidir; tam yol `parent → path` olarak sunulur.
    assert.deepEqual(blocks.map((block) => block.path), ["/databases/{database}/documents", "/a/{id}", "/b/{subId}"]);
    const a = blocks.find((block) => block.path === "/a/{id}");
    assert.equal(a.allows.get("get"), "true;");
    // Çok satırlı koşul tek parçaya iner.
    assert.match(a.allows.get("write"), /request\.auth\.uid == id/);
    const inner = blocks.find((block) => block.path === "/b/{subId}");
    assert.equal(inner.parent, "/a/{id}");
  });

  it("koşul özeti girişsiz/sahip/sınır ayrımını korur", () => {
    assert.equal(describeCondition("true;"), "herkes");
    assert.equal(describeCondition("false"), "kapalı");
    assert.equal(describeCondition("signedIn();"), "giriş");
    assert.equal(describeCondition("signedIn() && uid == request.auth.uid"), "giriş sahip");
    assert.equal(describeCondition("signedIn() && boundedList(50)"), "giriş ≤50");
    // Yorum satırı özete sızmaz.
    assert.equal(describeCondition("signedIn(); // yalnız üyeler"), "giriş");
  });
});

describe("rules-inventory — bu depodaki firestore.rules", () => {
  const blocks = parseRules(source);
  const summary = summarize(blocks);
  const byPath = new Map(blocks.map((block) => [block.path, block]));

  it("35 match bloğu var, 4'ü iç içe", () => {
    assert.equal(summary.total, 35);
    assert.equal(summary.nested, 4);
    assert.deepEqual(
      blocks.filter((block) => block.parent !== null).map((block) => block.path),
      ["/replies/{replyId}", "/messages/{messageId}", "/joinAttempts/{joinId}", "/invites/{invitedUid}"],
    );
  });

  it("girişsiz erişim yalnız places ve posts get'te", () => {
    assert.deepEqual(summary.openBlocks, ["/places/{placeId}", "/posts/{postId}"]);
    for (const path of ["/verifications/{verificationId}", "/users/{uid}/following/{targetUid}", "/userProfiles/{uid}", "/groups/{groupId}"]) {
      const block = byPath.get(path);
      assert.ok(block, `${path} bloğu yok`);
      for (const condition of block.allows.values()) {
        assert.notEqual(describeCondition(condition), "herkes", `${path} içinde girişsiz erişim var`);
      }
    }
  });

  it("sosyal bloklar yayın listesinde (canlıdan eksik kalmasın)", () => {
    for (const path of [
      "/userProfiles/{uid}",
      "/users/{uid}/friendRequests/{requesterUid}",
      "/users/{uid}/friends/{friendUid}",
      "/users/{uid}/following/{targetUid}",
      "/friendships/{fid}",
      "/friendDeclines/{fid}",
      "/verifications/{verificationId}",
      "/moderators/{uid}",
      "/reports/{reportId}",
      "/bans/{uid}",
      "/warnings/{warningId}",
      "/appeals/{appealId}",
      "/modActions/{actionId}",
      "/announcements/{announcementId}",
    ]) {
      assert.ok(byPath.has(path), `${path} blokta yok`);
    }
  });

  it("fail-closed yakalayıcı korunuyor", () => {
    assert.deepEqual(summary.collectionGroups, ["/{path=**}/replies/{replyId}", "/{document=**}"]);
    const catchAll = byPath.get("/{document=**}");
    assert.equal(describeCondition(catchAll.allows.get("get") ?? "false"), "kapalı");
    // Joker bloğun tamamı read/write false olmalı: tek satırda birleşik yazım.
    assert.match([...catchAll.allows.values()].join(" "), /false/);
  });

  it("her kural bloğunda en az bir allow var (sessiz kapanma yok)", () => {
    assert.deepEqual(summary.missingAllow, []);
  });

  it("markdown çıktısı tüm blokları ve satır numaralarını taşır", () => {
    const markdown = toMarkdown(blocks);
    assert.match(markdown, /Toplam \*\*35\*\* match bloğu/);
    for (const block of blocks) {
      assert.ok(markdown.includes(`\`${block.parent ? `${block.parent} → ${block.path}` : block.path}\``), `${block.path} tabloda yok`);
      assert.ok(markdown.includes(`| ${block.line} |`), `${block.path} satır numarası yok`);
    }
  });
});
