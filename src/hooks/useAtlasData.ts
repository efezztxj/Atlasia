import { useCallback, useEffect, useRef, useState } from "react";
import { SEED_POSTS, SEED_STORIES } from "../data/feed";
import type { FeedPost, Place, Story, UploadPhotoKind } from "../types";
import { compressImage } from "../utils/image";
import { isStoryAlive } from "../utils/time";
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

export function useAtlasData(uid: string) {
  const me = useRef(clientId());
  const placesKey = `${PLACES_KEY}.${uid}`;
  const postsKey = `${POSTS_KEY}.${uid}`;
  const storiesKey = `${STORIES_KEY}.${uid}`;
  const [places, setPlaces] = useState<Place[]>(() => load(placesKey, [] as Place[]));
  const [posts, setPosts] = useState<FeedPost[]>(() => load(postsKey, SEED_POSTS));
  const [stories, setStories] = useState<Story[]>(() =>
    load(storiesKey, SEED_STORIES).filter((s) => isStoryAlive(s.createdAt)),
  );

  useEffect(() => save(placesKey, places), [placesKey, places]);
  useEffect(() => save(postsKey, posts), [postsKey, posts]);
  useEffect(() => save(storiesKey, stories), [storiesKey, stories]);

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
                { id: newId("fr"), author, text, createdAt: Date.now(), likes: 0, kind: "user" as const },
              ],
            }
          : p,
      ),
    );
  }, []);

  const toggleLike = useCallback(async (postId: string) => {
    const who = me.current;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const likedBy = p.likedBy ?? [];
        const has = likedBy.includes(who);
        return { ...p, likedBy: has ? likedBy.filter((x) => x !== who) : [...likedBy, who] };
      }),
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
    toggleLike,
    addStory,
    removeStory,
  };
}
