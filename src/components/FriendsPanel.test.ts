// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  backend: "firebase" as string,
  displayName: "Ada" as string | null,
  friends: [] as { friendUid: string; friendName: string; since: number }[],
  requests: [] as { id: string; fromUid: string; fromName: string; toUid: string; createdAt: number }[],
  profiles: [] as { uid: string; displayName: string; createdAt: number; updatedAt: number }[],
  subscribeFriends: vi.fn(),
  subscribeFriendRequests: vi.fn(),
  subscribeUserProfileSearch: vi.fn(),
  acceptFriendRequest: vi.fn(async (_recipient: string, _requester: string, _name: string) => ({})),
  declineFriendRequest: vi.fn(async (_recipient: string, _requester: string) => undefined),
  removeFriend: vi.fn(async (_uid: string, _friendUid: string) => undefined),
  sendFriendRequest: vi.fn(async (_input: { fromUid: string; fromName: string; toUid: string }) => undefined),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "me", backend: h.backend, displayName: h.displayName } }),
}));
vi.mock("../lib/friendships", () => ({
  subscribeFriends: (_uid: string, onChange: (items: unknown[]) => void, onError?: (e: Error) => void) => {
    h.subscribeFriends(_uid, onChange, onError);
    onChange(h.friends);
    return () => undefined;
  },
  subscribeFriendRequests: (_uid: string, onChange: (items: unknown[]) => void, onError?: (e: Error) => void) => {
    h.subscribeFriendRequests(_uid, onChange, onError);
    onChange(h.requests);
    return () => undefined;
  },
  acceptFriendRequest: (recipient: string, requester: string, name: string) =>
    h.acceptFriendRequest(recipient, requester, name),
  declineFriendRequest: (recipient: string, requester: string) => h.declineFriendRequest(recipient, requester),
  removeFriend: (uid: string, friendUid: string) => h.removeFriend(uid, friendUid),
  sendFriendRequest: (input: { fromUid: string; fromName: string; toUid: string }) => h.sendFriendRequest(input),
}));
vi.mock("../lib/userProfiles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/userProfiles")>();
  return {
    ...actual,
    subscribeUserProfileSearch: (_query: string, onChange: (items: unknown[]) => void, onError?: (e: Error) => void) => {
      h.subscribeUserProfileSearch(_query, onChange, onError);
      onChange(h.profiles);
      return () => undefined;
    },
  };
});

import FriendsPanel from "./FriendsPanel";

beforeEach(() => {
  h.backend = "firebase";
  h.displayName = "Ada";
  h.friends = [];
  h.requests = [];
  h.profiles = [];
  h.acceptFriendRequest.mockClear();
  h.declineFriendRequest.mockClear();
  h.removeFriend.mockClear();
  h.sendFriendRequest.mockClear();
  h.subscribeFriends.mockClear();
  h.subscribeFriendRequests.mockClear();
  h.subscribeUserProfileSearch.mockClear();
});

afterEach(() => cleanup());

describe("FriendsPanel", () => {
  it("cihaz hesabında bulut gerektiğini söyler ve Firestore'a abone olmaz", () => {
    h.backend = "device";
    render(createElement(FriendsPanel, { onClose: () => undefined }));
    expect(screen.getByText(/hesaplar arası bir özellik/i)).toBeTruthy();
    expect(h.subscribeFriends).not.toHaveBeenCalled();
    expect(h.subscribeFriendRequests).not.toHaveBeenCalled();
  });

  it("gelen isteği kabul ederken kendi uid'i ve adıyla çağırır", async () => {
    h.requests = [{ id: "u2", fromUid: "u2", fromName: "Deniz", toUid: "me", createdAt: 1 }];
    render(createElement(FriendsPanel, { onClose: () => undefined }));

    fireEvent.click(screen.getByRole("tab", { name: /İstekler/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Kabul et/i }));

    await waitFor(() => expect(h.acceptFriendRequest).toHaveBeenCalledWith("me", "u2", "Ada"));
    expect(await screen.findByRole("status")).toBeTruthy();
  });

  it("istek reddi ve arkadaşlıktan çıkarma onay ister", async () => {
    h.requests = [{ id: "u2", fromUid: "u2", fromName: "Deniz", toUid: "me", createdAt: 1 }];
    h.friends = [{ friendUid: "u3", friendName: "Efe", since: 1 }];
    render(createElement(FriendsPanel, { onClose: () => undefined }));

    fireEvent.click(screen.getByRole("tab", { name: /İstekler/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Reddet/i }));
    await waitFor(() => expect(h.declineFriendRequest).toHaveBeenCalledWith("me", "u2"));

    fireEvent.click(screen.getByRole("tab", { name: /Arkadaşlar/ }));
    // İlk tıklama yalnız onay ister, silmez.
    fireEvent.click(screen.getByRole("button", { name: /Çıkar/i }));
    expect(h.removeFriend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Onayla/i }));
    await waitFor(() => expect(h.removeFriend).toHaveBeenCalledWith("me", "u3"));
  });

  it("UID ile istek gönderir; kendi kimliğini reddeder", async () => {
    render(createElement(FriendsPanel, { onClose: () => undefined }));
    fireEvent.click(screen.getByRole("tab", { name: /^Ekle$/ }));
    fireEvent.click(screen.getByText(/Hesap kimliği \(UID\) ile ekle/i));

    const input = screen.getByLabelText(/Hesap kimliğiyle ekle/i);
    fireEvent.change(input, { target: { value: "u9" } });
    fireEvent.click(screen.getByRole("button", { name: /İstek gönder/i }));
    await waitFor(() => expect(h.sendFriendRequest).toHaveBeenCalledWith({ fromUid: "me", fromName: "Ada", toUid: "u9" }));

    h.sendFriendRequest.mockClear();
    fireEvent.change(input, { target: { value: "me" } });
    fireEvent.click(screen.getByRole("button", { name: /İstek gönder/i }));
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(h.sendFriendRequest).not.toHaveBeenCalled();
  });

  it("profil aramasında kendini gizler, büyük harfle sorgular ve başkasına istek gönderir", async () => {
    h.profiles = [
      { uid: "me", displayName: "Ada", createdAt: 0, updatedAt: 0 },
      { uid: "u7", displayName: "Ada Nur", createdAt: 0, updatedAt: 0 },
    ];
    render(createElement(FriendsPanel, { onClose: () => undefined }));
    fireEvent.click(screen.getByRole("tab", { name: /^Ekle$/ }));
    fireEvent.change(screen.getByLabelText(/İsimle ara/i), { target: { value: "ada" } });

    const addButtons = await screen.findAllByRole("button", { name: /kişisine istek gönder$/ });
    expect(addButtons).toHaveLength(1);
    // Arama 250 ms debounce edilir; sorgu yazılan metinle (harf büyütme yardımcıda) yapılır.
    await waitFor(() => expect(h.subscribeUserProfileSearch).toHaveBeenLastCalledWith("ada", expect.any(Function), expect.any(Function)));
    fireEvent.click(addButtons[0]);
    await waitFor(() => expect(h.sendFriendRequest).toHaveBeenCalledWith({ fromUid: "me", fromName: "Ada", toUid: "u7" }));
    // Gönderim sonrası düğme "Gönderildi" durumuna geçer; ikinci kez istek atılmaz.
    expect(await screen.findByText(/Gönderildi/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /kişisine istek gönder$/ })).toBeNull();
  });

  it("2 harften kısa aramada sorgu açmaz ve son aramaları gösterir", async () => {
    localStorage.setItem("atlasia:profil-arama:me", JSON.stringify([{ uid: "u5", displayName: "Ece Yıldız", at: 1 }]));
    render(createElement(FriendsPanel, { onClose: () => undefined }));
    fireEvent.click(screen.getByRole("tab", { name: /^Ekle$/ }));

    fireEvent.change(screen.getByLabelText(/İsimle ara/i), { target: { value: "a" } });
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(h.subscribeUserProfileSearch).not.toHaveBeenCalled();
    expect(screen.getByText(/Son aramalar/i)).toBeTruthy();

    // Son aramaya dokunmak arama kutusunu doldurur.
    fireEvent.click(screen.getByRole("button", { name: /Ece Yıldız/ }));
    expect((screen.getByLabelText(/İsimle ara/i) as HTMLInputElement).value).toBe("Ece Yıldız");
    localStorage.removeItem("atlasia:profil-arama:me");
  });
});
