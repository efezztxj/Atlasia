/**
 * Atlasia — useFirestoreAtlasData
 * useAtlasData'nın Firestore destekli versiyonu.
 * Mevcut App.tsx'in beklediği API'yi korur.
 *
 * Hata yönetimi: Firestore hata verirse, App.tsx'e hazır olmadığını
 * `ready=false` ve `error` ile bildirir. App yalnız görünür listelerde yerel
 * içeriği kullanır; bulut hesaplarının yazma/silme işlemleri yerelde taklit edilmez.
 */
import { useEffect, useState } from "react";
import {
  addPlace as addPlaceFs,
  addPost as addPostFs,
  addReply as addReplyFs,
  addStory as addStoryFs,
  isCloudReady,
  removePlace as removePlaceFs,
  removePost as removePostFs,
  removeStory as removeStoryFs,
  subscribePlaces,
  subscribePosts,
  subscribeStories,
  togglePostLike as togglePostLikeFs,
  uploadPhoto as uploadPhotoFs,
  type NewPlaceInput,
  type NewPostInput,
  type NewStoryInput,
} from "../lib/firestoreData";
import type { FeedPost, Place, Story, UploadPhotoKind } from "../types";

export interface UseFirestoreAtlasDataArgs {
  uid: string;
  enabled?: boolean;
}

export function useFirestoreAtlasData({ uid, enabled = true }: UseFirestoreAtlasDataArgs) {
  const [loaded, setLoaded] = useState({ places: false, posts: false, stories: false });
  const [places, setPlaces] = useState<Place[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoaded({ places: false, posts: false, stories: false });
    setError(null);
    if (!enabled || !isCloudReady || !uid) return;

    // Üç koleksiyonun da ilk snapshot'ı gelmeden bulut görünümüne geçme.
    // Böylece biri önce geldiğinde diğer listeler kısa süreli boş görünmez.
    // Canlı abone ol (real-time updates)
    const unsubPlaces = subscribePlaces(
      (p) => {
        setPlaces(p);
        setLoaded((current) => ({ ...current, places: true }));
      },
      (e) => {
        console.error("[Atlasia] Places subscribe hatası:", e);
        setError(e);
        setLoaded((current) => ({ ...current, places: false }));
      },
    );
    const unsubPosts = subscribePosts(
      (p) => {
        setPosts(p);
        setLoaded((current) => ({ ...current, posts: true }));
      },
      (e) => {
        console.error("[Atlasia] Posts subscribe hatası:", e);
        setError(e);
        setLoaded((current) => ({ ...current, posts: false }));
      },
    );
    const unsubStories = subscribeStories(
      (s) => {
        setStories(s);
        setLoaded((current) => ({ ...current, stories: true }));
      },
      (e) => {
        console.error("[Atlasia] Stories subscribe hatası:", e);
        setError(e);
        setLoaded((current) => ({ ...current, stories: false }));
      },
    );

    return () => {
      unsubPlaces();
      unsubPosts();
      unsubStories();
    };
  }, [uid, enabled]);

  const uploadPhoto = async (file: File, kind: UploadPhotoKind): Promise<string> => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, fotoğraf hazırlanamaz.");
    return uploadPhotoFs(file, kind);
  };

  const addPlace = async (p: Omit<Place, "id" | "kind" | "createdAt">): Promise<Place> => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, pin kaydedilemez.");
    const input: NewPlaceInput = {
      uid,
      title: p.title,
      region: p.region,
      category: p.category,
      lng: p.lng,
      lat: p.lat,
      note: p.note,
      author: p.author,
      photoUrl: p.photo,
    };
    return addPlaceFs(input);
  };

  const removePlace = async (id: string) => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, pin silinemedi.");
    return removePlaceFs(id, uid);
  };

  const addPost = async (p: Partial<FeedPost>) => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, gönderi kaydedilemez.");
    const input: NewPostInput = {
      uid,
      author: p.author ?? "Gezgin",
      text: p.text ?? "",
      placeLabel: p.placeLabel,
      lng: p.lng,
      lat: p.lat,
      photoUrl: p.photo,
    };
    await addPostFs(input);
  };

  const removePost = async (id: string) => {
    if (!isCloudReady) return;
    return removePostFs(id);
  };

  const addReply = async (postId: string, author: string, text: string) => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, yanıt eklenemez.");
    await addReplyFs(postId, uid, author, text);
  };

  const toggleLike = async (postId: string) => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, beğeni kaydedilemez.");
    await togglePostLikeFs(postId, uid);
  };

  const addStory = async (s: Partial<Story>) => {
    if (!isCloudReady) throw new Error("Bulut bağlantısı yok, story kaydedilemez.");
    const input: NewStoryInput = {
      uid,
      author: s.author ?? "Gezgin",
      text: s.text ?? "",
      accent: s.accent ?? "leaf",
      placeLabel: s.placeLabel,
      lng: s.lng,
      lat: s.lat,
      photoUrl: s.photo,
    };
    await addStoryFs(input);
  };

  const removeStory = async (id: string) => {
    if (!isCloudReady) return;
    return removeStoryFs(id);
  };

  const ready = loaded.places && loaded.posts && loaded.stories && !error;

  return {
    ready,
    error,
    // Bulut beğenileri Firestore'a Firebase UID ile yazılır; arayüz de aynı
    // kimliği kullanmalı ki kalp durumu ve ikinci dokunuş doğru çalışsın.
    clientId: uid,
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
