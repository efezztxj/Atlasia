// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FirestoreCursor,
  FirestorePage,
  NewPlaceInput,
  NewPostInput,
  NewStoryInput,
  PlaceViewport,
  StoryPage,
} from "../lib/firestoreData";
import type { FeedPost, FeedReply, Place, Story, UploadPhotoKind } from "../types";

type PlaceSub = {
  uid?: string;
  viewport?: PlaceViewport;
  onChange: (places: Place[]) => void;
  onError?: (error: Error) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
};
type PostSub = {
  onChange: (page: FirestorePage<FeedPost>) => void;
  onError?: (error: Error) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
};
type StorySub = {
  onChange: (page: StoryPage) => void;
  onError?: (error: Error) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
};

const h = vi.hoisted(() => ({
  ownedSubs: [] as PlaceSub[],
  overviewSubs: [] as PlaceSub[],
  viewportSubs: [] as PlaceSub[],
  postSubs: [] as PostSub[],
  storySubs: [] as StorySub[],
  listPostsPage: vi.fn<(cursor?: FirestoreCursor) => Promise<FirestorePage<FeedPost>>>(),
  listStoriesPage: vi.fn<(cursor: FirestoreCursor, cutoffMs: number) => Promise<StoryPage>>(),
  listPostReplies: vi.fn<(postId: string) => Promise<FeedReply[]>>(),
  addPlace: vi.fn<(input: NewPlaceInput) => Promise<Place>>(),
  removePlace: vi.fn<(id: string, uid: string) => Promise<void>>(),
  addPost: vi.fn<(input: NewPostInput) => Promise<void>>(),
  removePost: vi.fn<(id: string) => Promise<void>>(),
  addReply: vi.fn<(postId: string, uid: string, author: string, text: string) => Promise<void>>(),
  togglePostLike: vi.fn<(postId: string, uid: string) => Promise<string[]>>(),
  addStory: vi.fn<(input: NewStoryInput) => Promise<void>>(),
  removeStory: vi.fn<(id: string) => Promise<void>>(),
  uploadPhoto: vi.fn<(file: File, kind: UploadPhotoKind) => Promise<string>>(),
}));

vi.mock("../lib/firestoreData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/firestoreData")>();
  return {
    ...actual,
    isCloudReady: true,
    subscribeOwnedPlaces: (
      uid: string,
      onChange: (places: Place[]) => void,
      onError?: (error: Error) => void,
    ) => {
      const unsubscribe = vi.fn();
      h.ownedSubs.push({ uid, onChange, onError, unsubscribe });
      return unsubscribe;
    },
    subscribePlaceOverview: (
      onChange: (places: Place[]) => void,
      onError?: (error: Error) => void,
    ) => {
      const unsubscribe = vi.fn();
      h.overviewSubs.push({ onChange, onError, unsubscribe });
      return unsubscribe;
    },
    subscribePlacesInViewport: (
      viewport: PlaceViewport,
      onChange: (places: Place[]) => void,
      onError?: (error: Error) => void,
    ) => {
      const unsubscribe = vi.fn();
      h.viewportSubs.push({ viewport, onChange, onError, unsubscribe });
      return unsubscribe;
    },
    subscribePosts: (
      onChange: (page: FirestorePage<FeedPost>) => void,
      onError?: (error: Error) => void,
    ) => {
      const unsubscribe = vi.fn();
      h.postSubs.push({ onChange, onError, unsubscribe });
      return unsubscribe;
    },
    subscribeStories: (
      onChange: (page: StoryPage) => void,
      onError?: (error: Error) => void,
    ) => {
      const unsubscribe = vi.fn();
      h.storySubs.push({ onChange, onError, unsubscribe });
      return unsubscribe;
    },
    listPostsPage: h.listPostsPage,
    listStoriesPage: h.listStoriesPage,
    listPostReplies: h.listPostReplies,
    addPlace: h.addPlace,
    removePlace: h.removePlace,
    addPost: h.addPost,
    removePost: h.removePost,
    addReply: h.addReply,
    togglePostLike: h.togglePostLike,
    addStory: h.addStory,
    removeStory: h.removeStory,
    uploadPhoto: h.uploadPhoto,
  };
});

import {
  useFirestoreAtlasData,
  type UseFirestoreAtlasDataArgs,
} from "./useFirestoreAtlasData";

const NOW = 1_700_000_000_000;
const cursor = (id: string) => ({ id }) as unknown as FirestoreCursor;

const place = (id: string, createdAt: number, title = `Yer ${id}`): Place => ({
  id,
  title,
  region: "İzmir",
  category: "history",
  lng: 27.14,
  lat: 38.42,
  note: "Not",
  author: "efe",
  authorUid: "u1",
  kind: "user",
  createdAt,
});

const post = (id: string, createdAt: number): FeedPost => ({
  id,
  author: "efe",
  authorUid: "u1",
  text: `Gönderi ${id}`,
  createdAt,
  likes: 0,
  likedBy: [],
  replies: [],
  kind: "user",
});

const story = (id: string, createdAt: number): Story => ({
  id,
  author: "efe",
  authorUid: "u1",
  text: `Story ${id}`,
  accent: "sea",
  createdAt,
  kind: "user",
});

const emptyPostPage: FirestorePage<FeedPost> = { items: [], cursor: null, hasMore: false };
const emptyStoryPage: StoryPage = { items: [], cursor: null, hasMore: false, cutoffMs: NOW - 86_400_000 };

function renderData(initialProps: UseFirestoreAtlasDataArgs = { uid: "u1" }) {
  return renderHook((props: UseFirestoreAtlasDataArgs) => useFirestoreAtlasData(props), {
    initialProps,
  });
}

function advanceViewport(): void {
  act(() => vi.advanceTimersByTime(300));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  h.ownedSubs.length = 0;
  h.overviewSubs.length = 0;
  h.viewportSubs.length = 0;
  h.postSubs.length = 0;
  h.storySubs.length = 0;
  h.listPostsPage.mockReset().mockResolvedValue(emptyPostPage);
  h.listStoriesPage.mockReset().mockResolvedValue(emptyStoryPage);
  h.listPostReplies.mockReset().mockResolvedValue([]);
  h.addPlace.mockReset().mockImplementation(async (input) => ({
    id: "olusan-yer",
    title: input.title,
    region: input.region,
    category: input.category,
    lng: input.lng,
    lat: input.lat,
    note: input.note,
    author: input.author,
    authorUid: input.uid,
    photo: input.photoUrl,
    kind: "user",
    createdAt: NOW + 10_000,
  }));
  h.removePlace.mockReset().mockResolvedValue(undefined);
  h.addPost.mockReset().mockResolvedValue(undefined);
  h.removePost.mockReset().mockResolvedValue(undefined);
  h.addReply.mockReset().mockResolvedValue(undefined);
  h.togglePostLike.mockReset().mockResolvedValue(["u1"]);
  h.addStory.mockReset().mockResolvedValue(undefined);
  h.removeStory.mockReset().mockResolvedValue(undefined);
  h.uploadPhoto.mockReset().mockResolvedValue("data:image/jpeg;base64,BULUT");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useFirestoreAtlasData orkestrasyonu", () => {
  it("enabled=false veya boş uid ile hiçbir abonelik açmaz", () => {
    const disabled = renderData({ uid: "u1", enabled: false });
    advanceViewport();
    expect(disabled.result.current.ready).toBe(false);
    expect(disabled.result.current.places).toEqual([]);
    disabled.unmount();

    const anonymous = renderData({ uid: "" });
    advanceViewport();
    expect(anonymous.result.current.ready).toBe(false);
    expect(h.ownedSubs).toEqual([]);
    expect(h.postSubs).toEqual([]);
    expect(h.storySubs).toEqual([]);
    expect(h.overviewSubs).toEqual([]);
    expect(h.viewportSubs).toEqual([]);
  });

  it("misafir (T4): sahip aboneliği kurulmaz, genel okumalar sürer ve hazır olur", () => {
    const { result } = renderData({ uid: "", guest: true });
    advanceViewport();

    // Yazma zaten kapıda; sahip sorgusu da hiç açılmaz.
    expect(h.ownedSubs).toEqual([]);
    expect(h.postSubs).toHaveLength(1);
    expect(h.storySubs).toHaveLength(1);
    expect(h.overviewSubs.length + h.viewportSubs.length).toBeGreaterThan(0);
    expect(result.current.ready).toBe(false);

    // Üç genel kaynak yüklenince misafir haritası hazır olur (sahip beklenmez).
    act(() => {
      h.overviewSubs[0]?.onChange([place("misafir-yer", NOW)]);
      h.postSubs[0]?.onChange({ items: [], cursor: null, hasMore: false });
      h.storySubs[0]?.onChange({ items: [], cursor: null, hasMore: false, cutoffMs: NOW - 86_400_000 });
    });
    expect(result.current.ready).toBe(true);
    expect(result.current.places).toHaveLength(1);
  });

  it("misafir yazmaya kalkarsa veri katmanı reddeder", async () => {
    const { result } = renderData({ uid: "", guest: true });
    advanceViewport();
    await expect(result.current.addPlace({
      title: "x", region: "y", category: "history", lng: 1, lat: 1, note: "", author: "m",
    })).rejects.toThrow(/Misafir/);
    await expect(result.current.toggleLike("p1")).rejects.toThrow(/Misafir/);
    expect(h.addPlace).not.toHaveBeenCalled();
    expect(h.togglePostLike).not.toHaveBeenCalled();
  });

  it("dört kaynak yüklenince ready olur; yerleri kimlikle birleştirip yeniye sıralar", () => {
    const { result } = renderData();

    expect(h.ownedSubs).toHaveLength(1);
    expect(h.postSubs).toHaveLength(1);
    expect(h.storySubs).toHaveLength(1);
    expect(h.overviewSubs).toHaveLength(0);

    act(() => h.ownedSubs[0].onChange([
      place("ortak", 300, "Sahip sürümü"),
      place("sahip-eski", 100),
    ]));
    act(() => h.postSubs[0].onChange({
      items: [post("eski-post", 100), post("yeni-post", 300)],
      cursor: cursor("post-cursor"),
      hasMore: true,
    }));
    act(() => h.storySubs[0].onChange({
      items: [
        story("eski-story", NOW - 90_000_000),
        story("gelecek-story", NOW + 10_000),
        story("taze-story", NOW - 60_000),
      ],
      cursor: cursor("story-cursor"),
      hasMore: true,
      cutoffMs: NOW - 86_400_000,
    }));
    expect(result.current.ready).toBe(false);

    advanceViewport();
    expect(h.overviewSubs).toHaveLength(1);
    act(() => h.overviewSubs[0].onChange([
      place("gorunum-yeni", 400),
      place("ortak", 300, "Viewport sürümü"),
    ]));

    expect(result.current.ready).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.places.map((item) => item.id)).toEqual([
      "gorunum-yeni",
      "ortak",
      "sahip-eski",
    ]);
    expect(result.current.places.find((item) => item.id === "ortak")?.title).toBe("Sahip sürümü");
    expect(result.current.posts.map((item) => item.id)).toEqual(["yeni-post", "eski-post"]);
    expect(result.current.stories.map((item) => item.id)).toEqual(["taze-story"]);
    expect(result.current.hasMorePosts).toBe(true);
    expect(result.current.hasMoreStories).toBe(true);
  });

  it("kaynak hatası ready'yi kapatır; aynı kaynağın sonraki başarısı hatayı temizler", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = renderData();
    const hata = new Error("posts izni yok");

    act(() => h.postSubs[0].onError?.(hata));
    expect(result.current.error).toBe(hata);
    expect(result.current.ready).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    act(() => h.ownedSubs[0].onChange([]));
    act(() => h.storySubs[0].onChange(emptyStoryPage));
    advanceViewport();
    act(() => h.overviewSubs[0].onChange([]));
    expect(result.current.ready).toBe(false);

    act(() => h.postSubs[0].onChange(emptyPostPage));
    expect(result.current.error).toBeNull();
    expect(result.current.ready).toBe(true);
  });

  it("viewport sorgusunu 300 ms debounce eder; dar pencerede viewport, genişte overview seçer", () => {
    const narrow: PlaceViewport = {
      zoom: 10,
      bounds: { west: 27, south: 38, east: 28, north: 39 },
    };
    const { result, rerender, unmount } = renderData({ uid: "u1", viewport: narrow });

    act(() => vi.advanceTimersByTime(299));
    expect(h.viewportSubs).toHaveLength(0);
    expect(h.overviewSubs).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1));
    expect(h.viewportSubs).toHaveLength(1);
    expect(h.viewportSubs[0].viewport).toEqual(narrow);

    rerender({ uid: "u1", viewport: { zoom: 4, bounds: narrow.bounds } });
    expect(h.viewportSubs[0].unsubscribe).toHaveBeenCalledTimes(1);
    advanceViewport();
    expect(h.overviewSubs).toHaveLength(1);
    expect(result.current.ready).toBe(false);
    unmount();
    expect(h.overviewSubs[0].unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("post/story sayfalamasında cursor, cutoff, tekrar kilidi ve hasMore kuralları korunur", async () => {
    const { result } = renderData();
    const postCursor = cursor("post-ilk");
    const storyCursor = cursor("story-ilk");
    act(() => h.postSubs[0].onChange({
      items: [post("p2", 200), post("p1", 100)],
      cursor: postCursor,
      hasMore: true,
    }));
    act(() => h.storySubs[0].onChange({
      items: [story("s2", NOW - 200_000)],
      cursor: storyCursor,
      hasMore: true,
      cutoffMs: NOW - 50_000_000,
    }));

    let resolvePosts: ((page: FirestorePage<FeedPost>) => void) | undefined;
    h.listPostsPage.mockImplementationOnce(
      () => new Promise<FirestorePage<FeedPost>>((resolve) => { resolvePosts = resolve; }),
    );
    let postPromise: Promise<void> | undefined;
    act(() => {
      postPromise = result.current.loadMorePosts();
    });
    expect(result.current.loadingMorePosts).toBe(true);
    act(() => {
      void result.current.loadMorePosts();
    });
    expect(h.listPostsPage).toHaveBeenCalledTimes(1);
    expect(h.listPostsPage).toHaveBeenCalledWith(postCursor);

    await act(async () => {
      resolvePosts?.({
        items: [post("p0", 50), { ...post("p1", 100), text: "kuyruk sürümü" }],
        cursor: null,
        hasMore: true,
      });
      await postPromise;
    });
    expect(result.current.loadingMorePosts).toBe(false);
    expect(result.current.hasMorePosts).toBe(false); // cursor null ise hasMore zorla kapanır
    expect(result.current.posts.map((item) => item.id)).toEqual(["p2", "p1", "p0"]);
    expect(result.current.posts.find((item) => item.id === "p1")?.text).toBe("Gönderi p1");

    const nextStoryCursor = cursor("story-ikinci");
    h.listStoriesPage.mockResolvedValueOnce({
      items: [story("s1", NOW - 300_000)],
      cursor: nextStoryCursor,
      hasMore: false,
      cutoffMs: NOW - 50_000_000,
    });
    await act(async () => {
      await result.current.loadMoreStories();
    });
    expect(h.listStoriesPage).toHaveBeenCalledWith(storyCursor, NOW - 50_000_000);
    expect(result.current.stories.map((item) => item.id)).toEqual(["s2", "s1"]);
    expect(result.current.hasMoreStories).toBe(false);

    await act(async () => {
      await result.current.loadMorePosts();
      await result.current.loadMoreStories();
    });
    expect(h.listPostsPage).toHaveBeenCalledTimes(1);
    expect(h.listStoriesPage).toHaveBeenCalledTimes(1);
  });

  it("canlı ilk sayfa kayınca yüklenmiş kuyruktaki yerinden çıkan gönderiyi kaybetmez", async () => {
    const { result } = renderData();
    const firstCursor = cursor("ilk");
    act(() => h.postSubs[0].onChange({
      items: [post("p2", 200), post("p1", 100)],
      cursor: firstCursor,
      hasMore: true,
    }));
    h.listPostsPage.mockResolvedValueOnce({
      items: [post("p0", 50)],
      cursor: cursor("kuyruk"),
      hasMore: true,
    });
    await act(async () => {
      await result.current.loadMorePosts();
    });

    act(() => h.postSubs[0].onChange({
      items: [post("p3", 300), post("p2", 200)],
      cursor: cursor("yeni-bas"),
      hasMore: false,
    }));

    expect(result.current.posts.map((item) => item.id)).toEqual(["p3", "p2", "p1", "p0"]);
    expect(result.current.hasMorePosts).toBe(true); // kuyruk varken yeni başlık cursor'ı ezmez
  });

  it("sayfalama hatası error state'ine düşer ve loading bayrağını indirir", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = renderData();
    act(() => h.postSubs[0].onChange({
      items: [post("p1", 100)],
      cursor: cursor("c1"),
      hasMore: true,
    }));
    h.listPostsPage.mockRejectedValueOnce(new Error("sayfa okunamadı"));

    await act(async () => {
      await result.current.loadMorePosts();
    });

    expect(result.current.error?.message).toBe("sayfa okunamadı");
    expect(result.current.loadingMorePosts).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("yazma aksiyonları girdileri Firestore sözleşmesine çevirir ve yerel listeleri günceller", async () => {
    const { result } = renderData();
    act(() => h.ownedSubs[0].onChange([place("sahip", 100)]));
    advanceViewport();
    act(() => h.overviewSubs[0].onChange([place("sahip", 100), place("gorunum", 200)]));
    act(() => h.postSubs[0].onChange({ items: [post("post1", 100)], cursor: null, hasMore: false }));
    act(() => h.storySubs[0].onChange({
      items: [story("story1", NOW - 1000)],
      cursor: null,
      hasMore: false,
      cutoffMs: NOW - 86_400_000,
    }));

    const file = new File(["jpg"], "İz.jpg", { type: "image/jpeg" });
    await expect(result.current.uploadPhoto(file, "place")).resolves.toContain("BULUT");
    expect(h.uploadPhoto).toHaveBeenCalledWith(file, "place");

    const newPlace = place("taslak", 1);
    let created: Place | undefined;
    await act(async () => {
      created = await result.current.addPlace(newPlace);
    });
    expect(h.addPlace).toHaveBeenCalledWith({
      uid: "u1",
      title: newPlace.title,
      region: newPlace.region,
      category: newPlace.category,
      lng: newPlace.lng,
      lat: newPlace.lat,
      note: newPlace.note,
      author: newPlace.author,
      photoUrl: newPlace.photo,
    });
    expect(created?.id).toBe("olusan-yer");
    expect(result.current.places[0].id).toBe("olusan-yer");

    await act(async () => {
      await result.current.removePlace("sahip");
    });
    expect(h.removePlace).toHaveBeenCalledWith("sahip", "u1");
    expect(result.current.places.some((item) => item.id === "sahip")).toBe(false);

    await act(async () => {
      await result.current.addPost({
        text: "İğneada sakin",
        placeLabel: "İğneada",
        lng: 28,
        lat: 41,
        photo: "data:image/jpeg;base64,AA",
      });
      await result.current.addStory({ text: "Şelale" });
    });
    expect(h.addPost).toHaveBeenCalledWith({
      uid: "u1",
      author: "Gezgin",
      text: "İğneada sakin",
      placeLabel: "İğneada",
      lng: 28,
      lat: 41,
      photoUrl: "data:image/jpeg;base64,AA",
    });
    expect(h.addStory).toHaveBeenCalledWith(expect.objectContaining({
      uid: "u1",
      author: "Gezgin",
      text: "Şelale",
      accent: "leaf",
    }));
    // Eklenen post/story yerel listeye iyimser eklenmez; canlı snapshot beklenir.
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.stories).toHaveLength(1);

    const replies: FeedReply[] = [{
      id: "r1",
      author: "efe",
      text: "Yanıt",
      createdAt: 1,
      likes: 0,
      kind: "user",
    }];
    h.listPostReplies.mockResolvedValueOnce(replies);
    await expect(result.current.loadPostReplies("post1")).resolves.toEqual(replies);
    await act(async () => {
      await result.current.addReply("post1", "efe", "Teşekkürler ğşı");
    });
    expect(h.addReply).toHaveBeenCalledWith("post1", "u1", "efe", "Teşekkürler ğşı");

    await act(async () => {
      await result.current.removePost("post1");
      await result.current.removeStory("story1");
    });
    expect(result.current.posts).toEqual([]);
    expect(result.current.stories).toEqual([]);
  });

  it("toggleLike başarılı yazıda likedBy'yi uygular; hata durumunda yerel durumu değiştirmez", async () => {
    const { result } = renderData();
    act(() => h.postSubs[0].onChange({
      items: [{ ...post("post1", 100), likedBy: ["baskasi"] }],
      cursor: null,
      hasMore: false,
    }));

    await act(async () => {
      await result.current.toggleLike("post1");
    });
    expect(h.togglePostLike).toHaveBeenCalledWith("post1", "u1");
    expect(result.current.posts[0].likedBy).toEqual(["u1"]);

    h.togglePostLike.mockRejectedValueOnce(new Error("beğeni reddi"));
    await expect(result.current.toggleLike("post1")).rejects.toThrow("beğeni reddi");
    expect(result.current.posts[0].likedBy).toEqual(["u1"]);
  });

  it("uid değişiminde tüm listeleri sıfırlar ve abonelikleri yeniler", () => {
    const { result, rerender, unmount } = renderData({ uid: "u1" });
    act(() => h.ownedSubs[0].onChange([place("p1", 100)]));
    act(() => h.postSubs[0].onChange({ items: [post("post1", 100)], cursor: null, hasMore: false }));
    act(() => h.storySubs[0].onChange(emptyStoryPage));
    advanceViewport();
    act(() => h.overviewSubs[0].onChange([]));
    expect(result.current.ready).toBe(true);

    rerender({ uid: "u2" });

    expect(result.current.ready).toBe(false);
    expect(result.current.places).toEqual([]);
    expect(result.current.posts).toEqual([]);
    expect(result.current.clientId).toBe("u2");
    expect(h.ownedSubs[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(h.postSubs[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(h.storySubs[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(h.overviewSubs[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(h.ownedSubs[1].uid).toBe("u2");

    unmount();
    expect(h.ownedSubs[1].unsubscribe).toHaveBeenCalledTimes(1);
  });
});
