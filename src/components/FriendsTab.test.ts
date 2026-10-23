// @vitest-environment jsdom
/**
 * #76 regresyonu: canlı aramada eski yanıt yarışı ve çift sorgu.
 *
 * - Yanıtlar ters sırada gelirse yalnız güncel sorgu sonucu/geçmişi yazar.
 * - Girdi minimumun altına inince eski sonuç görünmez; bekleyen yanıt
 *   sonuçları geri getiremez.
 * - Son arama çipi tek sorgu yapar; debounce aynı terimi tekrar göndermez.
 */
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEARCH_DEBOUNCE_MS } from "../hooks/useDebouncedValue";
import type { UserProfile } from "../lib/userProfiles";

interface PendingSearch {
  term: string;
  resolve: (profiles: UserProfile[]) => void;
  reject: (failure: unknown) => void;
}

const h = vi.hoisted(() => ({
  pending: [] as PendingSearch[],
  recent: [] as string[],
}));

vi.mock("../lib/userProfiles", () => ({
  searchUserProfiles: vi.fn((term: string) => new Promise<UserProfile[]>((resolve, reject) => {
    h.pending.push({ term, resolve, reject });
  })),
  fetchUserProfile: vi.fn(async () => null),
}));

vi.mock("../lib/friendships", () => ({
  acceptFriendRequest: vi.fn(async () => undefined),
  declineFriendRequest: vi.fn(async () => undefined),
  removeFriend: vi.fn(async () => undefined),
  sendFriendRequest: vi.fn(async () => undefined),
}));

vi.mock("../lib/searchHistory", () => ({
  readRecentSearches: vi.fn(() => [...h.recent]),
  pushRecentSearch: vi.fn((_uid: string, term: string) => {
    h.recent = [term, ...h.recent.filter((item) => item !== term)];
    return [...h.recent];
  }),
  clearRecentSearches: vi.fn(() => []),
}));

vi.mock("../utils/inviteLink", () => ({
  buildFriendInviteLink: () => "https://ornek.invalid/davet",
  shareOrCopy: vi.fn(async () => "copied"),
}));

import FriendsTab from "./FriendsTab";
import { searchUserProfiles } from "../lib/userProfiles";
import { pushRecentSearch } from "../lib/searchHistory";

const profile = (uid: string, displayName: string): UserProfile => ({
  uid,
  displayName,
  displayNameLower: displayName.toLocaleLowerCase("tr"),
  createdAt: 0,
  updatedAt: 0,
});

function renderTab() {
  const onStatus = vi.fn();
  const onError = vi.fn();
  render(createElement(FriendsTab, {
    currentUid: "me",
    currentName: "Ben",
    friends: [],
    requests: [],
    isBlocked: () => false,
    onStatus,
    onError,
  }));
  return { onStatus, onError };
}

function input() {
  return screen.getByLabelText("İsimle kişi ara");
}

async function typeAndDebounce(value: string) {
  fireEvent.change(input(), { target: { value } });
  await act(async () => {
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
  });
}

async function settle(pending: PendingSearch, profiles: UserProfile[]) {
  await act(async () => {
    pending.resolve(profiles);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  h.pending.length = 0;
  h.recent = [];
  vi.mocked(searchUserProfiles).mockClear();
  vi.mocked(pushRecentSearch).mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("FriendsTab canlı arama yarışı (#76)", () => {
  it("yanıtlar ters sırada gelirse eski yanıt sonucu ve geçmişi EZMEZ", async () => {
    renderTab();

    await typeAndDebounce("al"); // A başladı, bitmedi
    await typeAndDebounce("ali"); // B başladı
    expect(h.pending.map((item) => item.term)).toEqual(["al", "ali"]);

    // B önce döner → güncel sonuç ekrana gelir, geçmişe B yazılır.
    await settle(h.pending[1], [profile("u-ali", "Ali Veli")]);
    expect(screen.getByText("Ali Veli")).toBeTruthy();
    expect(pushRecentSearch).toHaveBeenCalledTimes(1);
    expect(pushRecentSearch).toHaveBeenCalledWith("me", "ali");

    // A geç döner → yok sayılır; geçmişe de yazılmaz.
    await settle(h.pending[0], [profile("u-al", "Al Eski")]);
    expect(screen.getByText("Ali Veli")).toBeTruthy();
    expect(screen.queryByText("Al Eski")).toBeNull();
    expect(pushRecentSearch).toHaveBeenCalledTimes(1);
  });

  it("eski sorgunun hatası güncel sonucu ve hata bildirimini etkilemez", async () => {
    const { onError } = renderTab();

    await typeAndDebounce("al");
    await typeAndDebounce("ali");
    await settle(h.pending[1], [profile("u-ali", "Ali Veli")]);
    await act(async () => {
      h.pending[0].reject(new Error("geç hata"));
    });

    expect(screen.getByText("Ali Veli")).toBeTruthy();
    expect(onError).not.toHaveBeenCalled();
  });

  it("girdi minimumun altına inince sonuç kaybolur; bekleyen yanıt geri getiremez", async () => {
    renderTab();

    await typeAndDebounce("al");
    await settle(h.pending[0], [profile("u-al", "Al Bir")]);
    expect(screen.getByText("Al Bir")).toBeTruthy();

    // Tek harfe inmek de sonuçları temizler (eskiden yalnız tam boşken temizleniyordu).
    await typeAndDebounce("a");
    expect(screen.queryByText("Al Bir")).toBeNull();

    // Yeni arama beklerken girdi silinirse geç yanıt sonuçları geri getiremez.
    await typeAndDebounce("al");
    expect(h.pending).toHaveLength(2);
    await typeAndDebounce("");
    await settle(h.pending[1], [profile("u-al2", "Al İki")]);
    expect(screen.queryByText("Al İki")).toBeNull();
    expect(pushRecentSearch).toHaveBeenCalledTimes(1);
  });

  it("girdi silinir silinmez (debounce dolmadan) bekleyen yanıt geçersizdir", async () => {
    renderTab();

    await typeAndDebounce("al");
    expect(h.pending).toHaveLength(1);

    // Zamanlayıcıyı ilerletmeden girdiyi temizle; sonra geç yanıt gelsin.
    fireEvent.change(input(), { target: { value: "" } });
    await settle(h.pending[0], [profile("u-al", "Al Bir")]);

    expect(screen.queryByText("Al Bir")).toBeNull();
    expect(pushRecentSearch).not.toHaveBeenCalled();
  });

  it("son arama çipi tek sorgu yapar; debounce aynı terimi tekrar göndermez", async () => {
    h.recent = ["ali"];
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: "ali" }));
    expect(searchUserProfiles).toHaveBeenCalledTimes(1);
    expect(h.pending).toHaveLength(1);

    // Debounce penceresi dolsa da ikinci sorgu açılmamalı.
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2);
    });
    expect(searchUserProfiles).toHaveBeenCalledTimes(1);

    await settle(h.pending[0], [profile("u-ali", "Ali Veli")]);
    expect(screen.getByText("Ali Veli")).toBeTruthy();
  });

  it("aynı terim sorgudayken form gönderimi ikinci sorgu açmaz", async () => {
    renderTab();

    await typeAndDebounce("ali");
    expect(searchUserProfiles).toHaveBeenCalledTimes(1);

    // Gönder butonu arama sürerken disabled; form submit yolu da çift açmamalı.
    const form = input().closest("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form as HTMLFormElement);
    expect(searchUserProfiles).toHaveBeenCalledTimes(1);

    await settle(h.pending[0], [profile("u-ali", "Ali Veli")]);
    expect(screen.getByText("Ali Veli")).toBeTruthy();
  });
});
