import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedPost, Place, Story, UploadPhotoKind } from "../types";
import { withoutSeedPosts, withoutSeedStories } from "../lib/contentIntegrity";
import { compressImage } from "../utils/image";
import { isStoryAlive } from "../utils/time";
import { toggleLikedBy } from "../utils/likes";
import { storageGet, storageSet } from "../utils/storage";

const PLACES_KEY = "atlasia.places.v2";
const POSTS_KEY = "atlasia.posts.v2";
const STORIES_KEY = "atlasia.stories.v2";
const CLIENT_KEY = "atlasia.clientId";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = storageGet(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  storageSet(key, JSON.stringify(value));
}

function clientId() {
  let value = storageGet(CLIENT_KEY);
  if (!value) {
    value = `c-${Math.random().toString(36).slice(2)}`;
    storageSet(CLIENT_KEY, value);
  }
  return value;
}

const newId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * @param persist `false` → misafir oturumu: yerel depoya hiçbir şey yazılmaz,
 *   başlangıç içeriği boştur. Misafirin kayıtları hesaba karışmaz, çünkü
 *   anahtar (`...v2.<uid>`) misafirde hiç oluşmaz.
 */
export function useAtlasData(uid: string, { persist = true }: { persist?: boolean } = {}) {
  const me = useRef(clientId());
  const placesKey = `${PLACES_KEY}.${uid}`;
  const postsKey = `${POSTS_KEY}.${uid}`;
  const storiesKey = `${STORIES_KEY}.${uid}`;
  const [places, setPlaces] = useState<Place[]>(() => persist ? load(placesKey, [] as Place[]) : []);
  const [posts, setPosts] = useState<FeedPost[]>(() =>
    persist ? withoutSeedPosts(load(postsKey, [] as FeedPost[])) : [],
  );
  const [stories, setStories] = useState<Story[]>(() =>
    persist
      ? withoutSeedStories(load(storiesKey, [] as Story[])).filter((story) => isStoryAlive(story.createdAt))
      : [],
  );

  useEffect(() => { if (persist) save(placesKey, places); }, [persist, placesKey, places]);
  useEffect(() => { if (persist) save(postsKey, posts); }, [persist, postsKey, posts]);
  useEffect(() => { if (persist) save(storiesKey, stories); }, [persist, storiesKey, stories]);

  const uploadPhoto = useCallback(async (file: File, _kind: UploadPhotoKind) => {
    const { dataUrl } = await compressImage(file, 860, 0.7);
    return dataUrl;
  }, []);

  const addPlace = useCallback(async (p: Omit<Place, "id" | "kind" | "createdAt">) => {
    const created: Place = { ...p, authorUid: uid, id: newId("u"), kind: "user", createdAt: Date.now() };
    setPlaces((prev) => [created, ...prev]);
    return created;
  }, [uid]);

  const removePlace = useCallback(async (id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addPost = useCallback(async (p: Partial<FeedPost>) => {
    const created: FeedPost = {
      id: newId("fp"),
      author: p.author ?? "Gezgin",
      authorUid: uid,
      text: p.text ?? "",
      createdAt: Date.now(),
      likes: 0,
      likedBy: [],
      replies: [],
      kind: "user",
      placeLabel: p.placeLabel,
      lng: p.lng,
      lat: p.lat,
      photo: p.photo,
    };
    setPosts((prev) => [created, ...prev]);
  }, [uid]);

  const removePost = useCallback(async (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addReply = useCallback(async (postId: string, author: string, text: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              replies: [
                ...p.replies,
                { id: newId("fr"), author, authorUid: uid, text, createdAt: Date.now(), likes: 0, kind: "user" as const },
              ],
            }
          : p,
      ),
    );
  }, [uid]);

  const loadPostReplies = useCallback(async (postId: string) => {
    return posts.find((post) => post.id === postId)?.replies ?? [];
  }, [posts]);

  /**
   * P16 #2: sayaç tek yerden türetilir — `totalLikes(post)` = içerik tabanı
   * (`likes`) + benzersiz `likedBy` üyeleri. Bu yüzden burada `likes`
   * **artırılmaz**; artırmak aynı beğeniyi iki kez sayardı. `likedBy` her
   * durumda tekilleştirilir ki eski/bozuk kayıtlar sayacı şişirmesin.
   */
  const toggleLike = useCallback(async (postId: string) => {
    const who = me.current;
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likedBy: toggleLikedBy(p.likedBy, who) } : p)),
    );
  }, []);

  const addStory = useCallback(async (s: Partial<Story>) => {
    const created: Story = {
      id: newId("st"),
      author: s.author ?? "Gezgin",
      authorUid: uid,
      text: s.text ?? "",
      accent: s.accent ?? "leaf",
      createdAt: Date.now(),
      kind: "user",
      placeLabel: s.placeLabel,
      lng: s.lng,
      lat: s.lat,
      photo: s.photo,
    };
    setStories((prev) => [created, ...prev]);
  }, [uid]);

  const removeStory = useCallback(async (id: string) => {
    setStories((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    clientId: me.current,
    places,
    posts,
    stories,
    uploadPhoto,
    addPlace,
    removePlace,
    addPost,
    removePost,
    addReply,
    loadPostReplies,
    toggleLike,
    addStory,
    removeStory,
  };
}
