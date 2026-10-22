import { describe, expect, it, vi } from "vitest";
import type { AppNotification } from "./notifications";
import { friendIndexCandidates, syncFriendIndexes } from "./friendSync";

const notification = (over: Partial<AppNotification>): AppNotification => ({
  id: "n1",
  recipientUid: "me",
  actorUid: "u2",
  type: "friend_accepted",
  title: "Istek kabul edildi",
  body: "Deniz arkadaslik isteğini kabul etti.",
  read: false,
  createdAt: 1,
  ...over,
});

describe("friendIndexCandidates", () => {
  it("yalnız friend_accepted + targetId olanları, kendini ve tekrarları ayıklayarak döndürür", () => {
    const list = [
      notification({ id: "a", targetId: "u2" }),
      notification({ id: "b", targetId: "u2" }),
      notification({ id: "c", targetId: "me" }),
      notification({ id: "d" }),
      notification({ id: "e", type: "friend_request", targetId: "u3" }),
      notification({ id: "f", type: "group_invite", targetId: "u4" }),
      notification({ id: "g", targetId: " u5 " }),
    ];
    expect(friendIndexCandidates(list, "me")).toEqual([
      { friendUid: "u2", friendName: "Gezgin" },
      { friendUid: "u5", friendName: "Gezgin" },
    ]);
  });

  it("boş kimlikte aday üretmez", () => {
    expect(friendIndexCandidates([notification({ targetId: "u2" })], "  ")).toEqual([]);
  });
});

describe("syncFriendIndexes", () => {
  it("profilden adı çözer ve ensure'ı doğru argümanlarla çağırır", async () => {
    const ensure = vi.fn(async () => true);
    const resolveName = vi.fn(async (uid: string) => (uid === "u2" ? "Deniz" : null));

    const result = await syncFriendIndexes({
      uid: "me",
      notifications: [notification({ targetId: "u2" }), notification({ id: "n2", targetId: "u6" })],
      ensure,
      resolveName,
    });

    expect(result).toEqual({ created: ["u2", "u6"], skipped: [], failed: [] });
    expect(ensure).toHaveBeenNthCalledWith(1, "me", "u2", "Deniz");
    // Ad çözülemezse "Gezgin" ile devam edilir (indeks yine kanıta bağlı).
    expect(ensure).toHaveBeenNthCalledWith(2, "me", "u6", "Gezgin");
  });

  it("ensure false dönerse skipped, hata atarsa failed olarak raporlanır ve akış durmaz", async () => {
    const ensured: string[] = [];
    const ensure = vi.fn(async (_uid: string, friendUid: string) => {
      ensured.push(friendUid);
      if (friendUid === "u3") throw Object.assign(new Error("denied"), { code: "permission-denied" });
      return false;
    });
    const onError = vi.fn();

    const result = await syncFriendIndexes({
      uid: "me",
      notifications: [
        notification({ targetId: "u2" }),
        notification({ id: "n2", targetId: "u3" }),
        notification({ id: "n3", targetId: "u4" }),
      ],
      ensure,
      resolveName: async () => null,
      onError,
    });

    expect(ensured).toEqual(["u2", "u3", "u4"]);
    expect(result.skipped).toEqual(["u2", "u4"]);
    expect(result.created).toEqual([]);
    expect(result.failed.map((item) => item.friendUid)).toEqual(["u3"]);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("ad çözümü hata verirse 'Gezgin' ile devam eder ve hatayı bildirir", async () => {
    const ensure = vi.fn(async () => true);
    const onError = vi.fn();

    await syncFriendIndexes({
      uid: "me",
      notifications: [notification({ targetId: "u2" })],
      ensure,
      resolveName: async () => {
        throw new Error("offline");
      },
      onError,
    });

    expect(ensure).toHaveBeenCalledWith("me", "u2", "Gezgin");
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
