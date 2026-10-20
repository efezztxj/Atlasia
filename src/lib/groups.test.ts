import { describe, expect, it } from "vitest";
import {
  buildOutgoingMessage,
  messageRecipients,
  normalizeMemberUids,
  validateGroupName,
  validateMessageText,
  visibleMessages,
  type Group,
  type GroupMessage,
} from "./groups";

const group: Group = {
  id: "group-1",
  name: "Kapadokya ekibi",
  ownerUid: "user-a",
  memberUids: ["user-a", "user-b"],
  createdAt: 1,
  updatedAt: 1,
};

describe("grup ve sohbet sözleşmesi", () => {
  it("davet listesini kendi UID'iyle temizler, tekrarları atar ve 20 üyede keser", () => {
    expect(normalizeMemberUids("user-a", [" user-b ", "user-b", ""])).toEqual(["user-a", "user-b"]);
    expect(normalizeMemberUids("user-a", Array.from({ length: 30 }, (_, index) => `u-${index}`))).toHaveLength(20);
  });

  it("grup adı sınırlarını doğrular", () => {
    expect(validateGroupName("Ka")).toBeNull();
    expect(validateGroupName("K")).toBe("group/name-too-short");
    expect(validateGroupName("x".repeat(81))).toBe("group/name-too-long");
  });

  it("iki kullanıcılı grupta mesaj alıcısı karşı taraftır, gönderen kendine bildirim üretmez", () => {
    expect(messageRecipients(group, "user-a")).toEqual(["user-b"]);
    expect(messageRecipients(group, "user-b")).toEqual(["user-a"]);
  });

  it("A kullanıcısının mesajı B'ye grup bildirimi olarak gider", () => {
    const outgoing = buildOutgoingMessage(group, { uid: "user-a", name: "Ada" }, "  Merhaba, yarın görüşelim.  ");
    expect(outgoing.message).toEqual({
      senderUid: "user-a",
      senderName: "Ada",
      text: "Merhaba, yarın görüşelim.",
    });
    expect(outgoing.recipients).toEqual(["user-b"]);
    expect(outgoing.notifications).toEqual([{
      recipientUid: "user-b",
      actorUid: "user-a",
      type: "group_message",
      title: "Kapadokya ekibi",
      body: "Ada: Merhaba, yarın görüşelim.",
      targetId: "group-1",
    }]);
  });

  it("iki kullanıcının karşılıklı mesajları aynı grupta birikir", () => {
    const fromA = buildOutgoingMessage(group, { uid: "user-a", name: "Ada" }, "Selam");
    const fromB = buildOutgoingMessage(group, { uid: "user-b", name: "Bora" }, "Selam, buradayım");
    expect(fromA.message.senderUid).toBe("user-a");
    expect(fromB.message.senderUid).toBe("user-b");
    expect(fromA.notifications[0].recipientUid).toBe("user-b");
    expect(fromB.notifications[0].recipientUid).toBe("user-a");
    expect(fromA.lastMessage.senderUid).not.toBe(fromB.lastMessage.senderUid);
  });

  it("boş veya 1000 karakteri aşan mesajı reddeder", () => {
    expect(validateMessageText("  ")).toBe("message/empty");
    expect(validateMessageText("x".repeat(1001))).toBe("message/too-long");
    expect(() => buildOutgoingMessage(group, { uid: "user-a", name: "Ada" }, "   ")).toThrowError(
      expect.objectContaining({ code: "message/empty" }),
    );
  });

  it("engellenen kullanıcının mesajlarını görünümden düşürür", () => {
    const messages: GroupMessage[] = [
      { id: "m-1", senderUid: "user-a", senderName: "Ada", text: "Bir", createdAt: 2 },
      { id: "m-2", senderUid: "user-b", senderName: "Bora", text: "İki", createdAt: 1 },
    ];
    expect(visibleMessages(messages, new Set(["user-b"])).map((item) => item.id)).toEqual(["m-1"]);
    expect(visibleMessages(messages, new Set())).toHaveLength(2);
  });
});
