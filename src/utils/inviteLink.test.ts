import { describe, expect, it } from "vitest";
import {
  buildFriendInviteLink,
  buildGroupInviteLink,
  captureInviteFromLocation,
  parseInvite,
  stripInviteFromHash,
  takePendingInvite,
} from "./inviteLink";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
  };
}

describe("davet bağlantısı", () => {
  it("grup bağlantısı üretilir ve geri çözülür", () => {
    const link = buildGroupInviteLink("https://atlasia.pages.dev/", "AbC123xyz9", "622058");
    expect(link).toBe("https://atlasia.pages.dev/#grup=AbC123xyz9.622058");
    expect(parseInvite(link)).toEqual({ kind: "group", groupId: "AbC123xyz9", code: "622058" });
  });

  it("arkadaş bağlantısı üretilir ve geri çözülür", () => {
    const link = buildFriendInviteLink("https://atlasia.pages.dev", "uidAAAA1111");
    expect(parseInvite(link)).toEqual({ kind: "friend", uid: "uidAAAA1111" });
  });

  it("elle yazılan KİMLİK.KOD / KİMLİK-KOD ve ?grup= biçimleri kabul edilir", () => {
    expect(parseInvite(" AbC123xyz9.622058 ")).toEqual({ kind: "group", groupId: "AbC123xyz9", code: "622058" });
    expect(parseInvite("AbC123xyz9-12345678")).toEqual({ kind: "group", groupId: "AbC123xyz9", code: "12345678" });
    expect(parseInvite("https://x.dev/?grup=AbC123xyz9.622058")).toEqual({ kind: "group", groupId: "AbC123xyz9", code: "622058" });
  });

  it("grup adı, kısa kod, rota bağlantısı ve bozuk girdi reddedilir", () => {
    expect(parseInvite("Gez")).toBeNull();
    expect(parseInvite("622058")).toBeNull();
    expect(parseInvite("AbC123xyz9.12345")).toBeNull();
    expect(parseInvite("https://atlasia.pages.dev/#r=v1.TOKEN")).toBeNull();
    expect(parseInvite("https://atlasia.pages.dev/#arkadas=../x")).toBeNull();
    expect(parseInvite("")).toBeNull();
  });

  it("fragment'tan yalnız davet anahtarı silinir", () => {
    expect(stripInviteFromHash("#grup=A.1")).toBe("");
    expect(stripInviteFromHash("#r=v1.T&arkadas=u1")).toBe("#r=v1.T");
  });

  it("açılışta davet saklanır, adresten silinir ve bir kez verilir", () => {
    const storage = memoryStorage();
    const replaced: string[] = [];
    const invite = captureInviteFromLocation({
      location: { hash: "#grup=AbC123xyz9.622058", pathname: "/", search: "" },
      history: { replaceState: (_d, _u, url) => { replaced.push(url ?? ""); } },
      sessionStorage: storage,
    });
    expect(invite).toEqual({ kind: "group", groupId: "AbC123xyz9", code: "622058" });
    expect(replaced).toEqual(["/"]);
    expect(takePendingInvite(storage)).toEqual(invite);
    expect(takePendingInvite(storage)).toBeNull();
  });

  it("davetsiz adreste hiçbir şey yazılmaz; bozuk kayıt yok sayılır", () => {
    const storage = memoryStorage();
    const replaced: string[] = [];
    expect(captureInviteFromLocation({
      location: { hash: "#r=v1.T", pathname: "/", search: "" },
      history: { replaceState: (_d, _u, url) => { replaced.push(url ?? ""); } },
      sessionStorage: storage,
    })).toBeNull();
    expect(replaced).toEqual([]);
    storage.setItem("atlasia.pendingInvite", "{bozuk");
    expect(takePendingInvite(storage)).toBeNull();
    storage.setItem("atlasia.pendingInvite", JSON.stringify({ kind: "group", groupId: "Gez", code: "1" }));
    expect(takePendingInvite(storage)).toBeNull();
  });
});
