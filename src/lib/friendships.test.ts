import { describe, expect, it } from "vitest";
import {
  friendshipIdFor,
  normalizeFriendIndex,
  normalizeFriendRequest,
  normalizeFriendship,
  validateFriendIndexInput,
  validateFriendRequestInput,
} from "./friendships";

describe("friendships", () => {
  it("friendshipId deterministik ve sirali olur", () => {
    expect(friendshipIdFor("bob", "alice")).toBe("alice_bob");
    expect(friendshipIdFor("alice", "bob")).toBe("alice_bob");
    expect(() => friendshipIdFor("same", "same")).toThrow();
    expect(() => friendshipIdFor("", "bob")).toThrow();
  });

  it("istek dogrulamasi UID ve isim sinirlarini korur", () => {
    expect(validateFriendRequestInput({ fromUid: "a", fromName: "Al", toUid: "b" })).toBeNull();
    expect(validateFriendRequestInput({ fromUid: "a", fromName: "A", toUid: "b" })).toBe("friend/name-invalid");
    expect(validateFriendRequestInput({ fromUid: "a", fromName: "Ali", toUid: "a" })).toBe("friend/self");
    expect(validateFriendRequestInput({ fromUid: "", fromName: "Ali", toUid: "b" })).toBe("friend/request-from-invalid");
  });

  it("arkadas index dogrulamasi", () => {
    expect(validateFriendIndexInput({ friendUid: "uid1", friendName: "Ayşe" })).toBeNull();
    expect(validateFriendIndexInput({ friendUid: "", friendName: "Ayşe" })).toBe("friend/uid-invalid");
    expect(validateFriendIndexInput({ friendUid: "uid1", friendName: "A" })).toBe("friend/name-invalid");
  });

  it("normalize friendRequest ve friendship", () => {
    const req = normalizeFriendRequest("alice", { fromUid: "alice", fromName: "Alice", toUid: "bob", createdAt: 1000 });
    expect(req.fromUid).toBe("alice");
    expect(req.toUid).toBe("bob");
    const friendship = normalizeFriendship("alice_bob", { users: ["bob", "alice"], requesterUid: "alice", recipientUid: "bob", status: "accepted", createdAt: 1000, updatedAt: 2000 });
    expect(friendship.users).toEqual(["alice", "bob"]);
    expect(friendship.status).toBe("accepted");
    const idx = normalizeFriendIndex("bob", { friendUid: "bob", friendName: "Bob", since: 3000 });
    expect(idx.friendUid).toBe("bob");
    expect(idx.friendName).toBe("Bob");
  });
});
