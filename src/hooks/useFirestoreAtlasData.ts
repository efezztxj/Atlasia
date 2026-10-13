/**
 * Atlasia — Firestore destekli veri katmanı.
 *
 * Harita pinleri küçük bir overview ya da dar viewport sorgusundan ve ayrıca
 * oturum sahibinin authorUid sorgusundan birleştirilir. Sosyal akış ve aktif
 * story'ler cursor ile sayfalanır; hiçbir sabit sayfa boyutu toplam görünürlük
 * tavanı olarak kullanılmaz.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  activeStories,
  addPlace as addPlaceFs,
  addPost as addPostFs,
  addReply as addReplyFs,
  addStory as addStoryFs,
  isCloudReady,
  listPostsPage,
  listStoriesPage,
  mergeRecordsById,
  preserveDisplacedPageItems,
  removePlace as removePlaceFs,
  removePost as removePostFs,
  removeStory as removeStoryFs,
  subscribeOwnedPlaces,
  subscribePlaceOverview,
  subscribePlacesInViewport,
  subscribePosts,
  subscribeStories,
  togglePostLike as togglePostLikeFs,
  uploadPhoto as uploadPhotoFs,
  viewportQueryWindows,
  type FirestoreCursor,
  type NewPlaceInput,
  type NewPostInput,
  type NewStoryInput,
  type PlaceViewport,
} from "../lib/firestoreData";
import type { FeedPost, Place, Story, UploadPhotoKind } from "../types";

export interface UseFirestoreAtlasDataArgs {
  uid: string;
  enabled?: boolean;
  viewport?: PlaceViewport | null;
}

type Source = "ownerPlaces" | "viewportPlaces" | "posts" | "stories";
type SourceState<T> = Record<Source, T>;

const initialLoaded: SourceState<boolean> = {
  ownerPlaces: false,
  viewportPlaces: false,
  posts: false,
  stories: false,
};

const initialErrors: SourceState<Error | null> = {
  ownerPlaces: null,
  viewportPlaces: null,
  posts: null,
  stories: null,
};

function sortNewest<T extends { createdAt?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function useFirestoreAtlasData({
  uid,
  enabled = true,
  viewport = null,
}: UseFirestoreAtlasDataArgs) {
  const [loaded, setLoaded] = useState<SourceState<boolean>>(initialLoaded);
  const [errors, setErrors] = useState<SourceState<Error | null>>(initialErrors);
  const [viewportPlaces, setViewportPlaces] = useState<Place[]>([]);
  const [ownedPlaces, setOwnedPlaces] = useState<Place[]>([]);
  const [postHead, setPostHead] = useState<FeedPost[]>([]);
  const [postTail, setPostTail] = useState<FeedPost[]>([]);
  const [storyHead, setStoryHead] = useState<Story[]>([]);
  const [storyTail, setStoryTail] = useState<Story[]>([]);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [hasMoreStories, setHasMoreStories] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [loadingMoreStories, setLoadingMoreStories] = useState(false);

  const postHeadRef = useRef<FeedPost[]>([]);
  const postTailRef = useRef<FeedPost[]>([]);
  const storyHeadRef = useRef<Story[]>([]);
  const storyTailRef = useRef<Story[]>([]);
  const postCursorRef = useRef<FirestoreCursor | null>(null);
  const storyCursorRef = useRef<FirestoreCursor | null>(null);
  const storyCutoffRef = useRef(0);
  const hasMorePostsRef = useRef(false);
  const hasMoreStoriesRef = useRef(false);
  const loadingMorePostsRef = useRef(false);
  const loadingMoreStoriesRef = useRef(false);

  const markLoaded = useCallback((source: Source) => {
    setLoaded((current) => ({ ...current, [source]: true }));
    setErrors((current) => ({ ...current, [source]: null }));
  }, []);

  const markError = useCallback((source: Source, error: Error) => {
    console.error(`[Atlasia] ${source} sorgusu başarısız:`, error);
    setErrors((current) => ({ ...current, [source]: error }));
  }, []);

  useEffect(() => {
    setLoaded(initialLoaded);
    setErrors(initialErrors);
    setViewportPlaces([]);
    setOwnedPlaces([]);
    setPostHead([]);
    setPostTail([]);
    setStoryHead([]);
    setStoryTail([]);
    postHeadRef.current = [];
    postTailRef.current = [];
    storyHeadRef.current = [];
    storyTailRef.current = [];
    postCursorRef.current = null;
    storyCursorRef.current = null;
    hasMorePostsRef.current = false;
    hasMoreStoriesRef.current = false;
    setHasMorePosts(false);
    setHasMoreStories(false);
  }, [uid, enabled]);

  // Sahip sorgusu viewport'tan bağımsızdır; kullanıcı kendi tüm izlerine erişir.
  useEffect(() => {
    if (!enabled || !isCloudReady || !uid) return;
    return subscribeOwnedPlaces(
      uid,
      (places) => {
        setOwnedPlaces(sortNewest(places));
        markLoaded("ownerPlaces");
      },
      (error) => markError("ownerPlaces", error),
    );
  }, [uid, enabled, markError, markLoaded]);

  const viewportZoom = viewport?.zoom;
  const viewportWest = viewport?.bounds.west;
  const viewportSouth = viewport?.bounds.south;
  const viewportEast = viewport?.bounds.east;
  const viewportNorth = viewport?.bounds.north;

  // Harita hareketleri sırasında sorgu fırtınasını önlemek için kısa debounce.
  // Düşük zoom / aşırı geniş sınırlar güvenli overview sayfasına geri düşer.
  useEffect(() => {
    if (!enabled || !isCloudReady || !uid) return;
    let unsubscribe = () => {};
    const timer = globalThis.setTimeout(() => {
      const onChange = (places: Place[]) => {
        setViewportPlaces(sortNewest(places));
        markLoaded("viewportPlaces");
      };
      const onError = (error: Error) => markError("viewportPlaces", error);
      const scopedViewport = viewportZoom !== undefined
        && viewportWest !== undefined
        && viewportSouth !== undefined
        && viewportEast !== undefined
        && viewportNorth !== undefined
        ? {
            zoom: viewportZoom,
            bounds: {
              west: viewportWest,
              south: viewportSouth,
              east: viewportEast,
              north: viewportNorth,
            },
          }
        : null;
      unsubscribe = scopedViewport && viewportQueryWindows(scopedViewport)
        ? subscribePlacesInViewport(scopedViewport, onChange, onError)
        : subscribePlaceOverview(onChange, onError);
    }, 300);

    return () => {
      globalThis.clearTimeout(timer);
      unsubscribe();
    };
  }, [
    uid,
    enabled,
    viewportZoom,
    viewportWest,
    viewportSouth,
    viewportEast,
    viewportNorth,
    markError,
    markLoaded,
  ]);

  useEffect(() => {
    if (!enabled || !isCloudReady || !uid) return;
    return subscribePosts(
      (page) => {
        if (postTailRef.current.length > 0) {
          const nextTail = preserveDisplacedPageItems(
            postHeadRef.current,
            page.items,
            postTailRef.current,
          );
          postTailRef.current = nextTail;
          setPostTail(nextTail);
        }
        postHeadRef.current = page.items;
        setPostHead(page.items);
        if (postTailRef.current.length === 0) {
          postCursorRef.current = page.cursor;
          hasMorePostsRef.current = page.hasMore;
          setHasMorePosts(page.hasMore);
        }
        markLoaded("posts");
      },
      (error) => markError("posts", error),
    );
  }, [uid, enabled, markError, markLoaded]);

  useEffect(() => {
    if (!enabled || !isCloudReady || !uid) return;
    return subscribeStories(
      (page) => {
        if (storyTailRef.current.length > 0) {
          const nextTail = preserveDisplacedPageItems(
            storyHeadRef.current,
            page.items,
            storyTailRef.current,
          );
          storyTailRef.current = nextTail;
          setStoryTail(nextTail);
        }
        storyHeadRef.current = page.items;
        setStoryHead(page.items);
        storyCutoffRef.current = page.cutoffMs;
        if (storyTailRef.current.length === 0) {
          storyCursorRef.current = page.cursor;
          hasMoreStoriesRef.current = page.hasMore;
          setHasMoreStories(page.hasMore);
        }
        markLoaded("stories");
      },
      (error) => markError("stories", error),
    );
  }, [uid, enabled, markError, markLoaded]);

  const loadMorePosts = useCallback(async () => {
    const cursor = postCursorRef.current;
    if (!cursor || !hasMorePostsRef.current || loadingMorePostsRef.current) return;
    loadingMorePostsRef.current = true;
    setLoadingMorePosts(true);
    try {
      const page = await listPostsPage(cursor);
      setPostTail((current) => {
        const next = mergeRecordsById(current, page.items);
        postTailRef.current = next;
        return next;
      });
      postCursorRef.current = page.cursor;
      hasMorePostsRef.current = page.hasMore && page.cursor !== null;
      setHasMorePosts(hasMorePostsRef.current);
    } catch (failure) {
      markError("posts", failure instanceof Error ? failure : new Error("Gönderiler yüklenemedi."));
    } finally {
      loadingMorePostsRef.current = false;
      setLoadingMorePosts(false);
    }
  }, [markError]);

  const loadMoreStories = useCallback(async () => {
    const cursor = storyCursorRef.current;
    if (!cursor || !hasMoreStoriesRef.current || loadingMoreStoriesRef.current) return;
    loadingMoreStoriesRef.current = true;
    setLoadingMoreStories(true);
    try {
      const page = await listStoriesPage(cursor, storyCutoffRef.current);
      setStoryTail((current) => {
        const next = mergeRecordsById(current, page.items);
        storyTailRef.current = next;
        return next;
      });
      storyCursorRef.current = page.cursor;
      hasMoreStoriesRef.current = page.hasMore && page.cursor !== null;
      setHasMoreStories(hasMoreStoriesRef.current);
    } catch (failure) {
      markError("stories", failure instanceof Error ? failure : new Error("Story'ler yüklenemedi."));
    } finally {
      loadingMoreStoriesRef.current = false;
      setLoadingMoreStories(false);
    }
  }, [markError]);

  const uploadPhoto = async (file: File, kind: UploadPhotoKind): Promise<string> => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, fotoğraf hazırlanamaz.");
    return uploadPhotoFs(file, kind);
  };

  const addPlace = async (place: Omit<Place, "id" | "kind" | "createdAt">): Promise<Place> => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, pin kaydedilemez.");
    const input: NewPlaceInput = {
      uid,
      title: place.title,
      region: place.region,
      category: place.category,
      lng: place.lng,
      lat: place.lat,
      note: place.note,
      author: place.author,
      photoUrl: place.photo,
    };
    const created = await addPlaceFs(input);
    setOwnedPlaces((current) => sortNewest(mergeRecordsById([created], current)));
    return created;
  };

  const removePlace = async (id: string) => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, pin silinemedi.");
    await removePlaceFs(id, uid);
    setOwnedPlaces((current) => current.filter((place) => place.id !== id));
    setViewportPlaces((current) => current.filter((place) => place.id !== id));
  };

  const addPost = async (post: Partial<FeedPost>) => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, gönderi kaydedilemez.");
    const input: NewPostInput = {
      uid,
      author: post.author ?? "Gezgin",
      text: post.text ?? "",
      placeLabel: post.placeLabel,
      lng: post.lng,
      lat: post.lat,
      photoUrl: post.photo,
    };
    await addPostFs(input);
  };

  const removePost = async (id: string) => {
    if (!isCloudReady) return;
    await removePostFs(id);
    setPostHead((current) => {
      const next = current.filter((post) => post.id !== id);
      postHeadRef.current = next;
      return next;
    });
    setPostTail((current) => {
      const next = current.filter((post) => post.id !== id);
      postTailRef.current = next;
      return next;
    });
  };

  const addReply = async (postId: string, author: string, text: string) => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, yanıt eklenemez.");
    await addReplyFs(postId, uid, author, text);
  };

  const toggleLike = async (postId: string) => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, beğeni kaydedilemez.");
    await togglePostLikeFs(postId, uid);
  };

  const addStory = async (story: Partial<Story>) => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, story kaydedilemez.");
    const input: NewStoryInput = {
      uid,
      author: story.author ?? "Gezgin",
      text: story.text ?? "",
      accent: story.accent ?? "leaf",
      placeLabel: story.placeLabel,
      lng: story.lng,
      lat: story.lat,
      photoUrl: story.photo,
    };
    await addStoryFs(input);
  };

  const removeStory = async (id: string) => {
    if (!isCloudReady) return;
    await removeStoryFs(id);
    setStoryHead((current) => {
      const next = current.filter((story) => story.id !== id);
      storyHeadRef.current = next;
      return next;
    });
    setStoryTail((current) => {
      const next = current.filter((story) => story.id !== id);
      storyTailRef.current = next;
      return next;
    });
  };

  const error = Object.values(errors).find((value): value is Error => value !== null) ?? null;
  const ready = Object.values(loaded).every(Boolean) && !error;
  const places = useMemo(
    () => sortNewest(mergeRecordsById(viewportPlaces, ownedPlaces)),
    [viewportPlaces, ownedPlaces],
  );
  const posts = useMemo(
    () => sortNewest(mergeRecordsById(postTail, postHead)),
    [postHead, postTail],
  );
  const stories = useMemo(
    () => sortNewest(activeStories(mergeRecordsById(storyTail, storyHead))),
    [storyHead, storyTail],
  );

  return {
    ready,
    error,
    clientId: uid,
    places,
    posts,
    stories,
    hasMorePosts,
    hasMoreStories,
    loadingMorePosts,
    loadingMoreStories,
    loadMorePosts,
    loadMoreStories,
    uploadPhoto,
    addPlace,
    removePlace,
    addPost,
    removePost,
    addReply,
    toggleLike,
    addStory,
    removeStory,
  };
}
