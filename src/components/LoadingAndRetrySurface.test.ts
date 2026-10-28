// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SocialPanel from "./SocialPanel";
import SearchBox from "./SearchBox";

vi.mock("../utils/geo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/geo")>();
  return {
    ...actual,
    searchWorld: vi.fn(() => new Promise(() => {})),
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderFeed(extra: { loading?: boolean; loadError?: string | null; onRetryLoad?: () => void }) {
  return render(
    createElement(SocialPanel, {
      open: true,
      onOpen: () => {},
      onClose: () => {},
      view: { zoom: 10, lng: 27.14, lat: 38.42 },
      locationLabel: "İzmir",
      onGoTo: () => {},
      precise: null,
      onRequestPrecise: () => {},
      posts: [],
      stories: [],
      loading: extra.loading,
      loadError: extra.loadError,
      onRetryLoad: extra.onRetryLoad,
      hasMorePosts: false,
      hasMoreStories: false,
      loadingMorePosts: false,
      loadingMoreStories: false,
      onLoadMorePosts: async () => {},
      onLoadMoreStories: async () => {},
      clientId: "u1",
      currentUid: "u1",
      uploadPhoto: async () => "",
      onAddPost: async () => {},
      onRemovePost: async () => {},
      onAddReply: async () => {},
      onLoadReplies: async () => [],
      onToggleLike: async () => {},
      onAddStory: async () => {},
      onRemoveStory: async () => {},
      blockedSet: new Set<string>(),
      isBlocked: () => false,
    }),
  );
}

describe("M-18 & M-19 · Yükleme iskeletleri ve yeniden deneme", () => {
  it("SocialPanel ilk yüklemede sahte boş durum yerine yükleme iskeletini gösterir", () => {
    const { container } = renderFeed({ loading: true });

    expect(screen.getByRole("status").textContent).toContain("Topluluk akışı yükleniyor");
    expect(screen.queryByText(/Bu bölgede henüz konuşma yok/)).toBeNull();
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThanOrEqual(3);
  });

  it("SocialPanel canlı veri hatasında kalıcı uyarı ve Yeniden dene eylemi sunar", () => {
    const onRetryLoad = vi.fn();
    renderFeed({ loadError: "Canlı akış yüklenemedi.", onRetryLoad });

    expect(screen.getByRole("alert").textContent).toContain("Canlı akış yüklenemedi");
    fireEvent.click(screen.getByRole("button", { name: "Yeniden dene" }));
    expect(onRetryLoad).toHaveBeenCalledTimes(1);
  });

  it("SearchBox uzak dünya araması sürerken iskelet satırlarını gösterir", () => {
    vi.useFakeTimers();
    const { container } = render(
      createElement(SearchBox, {
        places: [],
        onPick: () => {},
      }),
    );

    const input = screen.getByPlaceholderText("Ülke, şehir ya da yer ara...");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Efes" } });

    expect(screen.getByRole("status").textContent).toContain("Dünya taranıyor");
    expect(container.querySelectorAll(".skeleton").length).toBe(3);

    act(() => {
      vi.clearAllTimers();
    });
  });
});
