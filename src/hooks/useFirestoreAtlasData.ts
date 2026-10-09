/**
 * Atlasia — useFirestoreAtlasData
 * useAtlasData'nın Firestore destekli versiyonu.
 * Mevcut App.tsx'in beklediği API'yi korur:
 *   { places, posts, stories, clientId, uploadPhoto,
 *     addPlace, removePlace,
 *     addPost, removePost, addReply, toggleLike,
 *     addStory, removeStory }
 *
 * Firestore hazır değilse null döner; App.tsx yerel useAtlasData'ya düşer.
 */
import { useEffect, useState } from "react";
import {
  addPlace as addPlaceFs,
  addPost as addPostFs,
  addReply as addReplyFs,
  addStory as addStoryFs,
  isCloudReady,
  listPlaces as listPlacesFs,
  removePlace as removePlaceFs,
  removePost as removePostFs,
  removeStory as removeStoryFs,
  subscribePosts,
  subscribeStories,
  togglePostLike as togglePostLikeFs,
  uploadPhoto as uploadPhotoFs,
  type NewPlaceInput,
  type NewPostInput,
  type NewStoryInput,
} from "../lib/firestoreData";
import type { FeedPost, Place, Story } from "../types";

function clientId() {
  let v = localStorage.getItem("atlasia.clientId");
  if (!v) {
    v = `c-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("atlasia.clientId", v);
  }
  return v;
}

export interface UseFirestoreAtlasDataArgs {
  uid: string;
  enabled?: boolean;
}

export function useFirestoreAtlasData({ uid, enabled = true }: UseFirestoreAtlasDataArgs) {
  const [ready, setReady] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !isCloudReady || !uid) {
      setReady(false);
      return;
    }
    setReady(true);

    // İlk yükleme
    listPlacesFs(uid).then(setPlaces).catch((e) => setError(e));

    // Canlı abone ol
    const unsubPosts = subscribePosts(setPosts, setError);
    const unsubStories = subscribeStories(setStories, setError);

    return () => {
      unsubPosts();
      unsubStories();
    };
  }, [uid, enabled]);

  const uploadPhoto = async (file: File): Promise<string> => uploadPhotoFs(file, "uploads", uid);

  const addPlace = async (p: Omit<Place, "id" | "kind" | "createdAt">): Promise<Place> => {
    const input: NewPlaceInput = {
      uid,
      title: p.title,
      region: p.region,
      category: p.category,
      lng: p.lng,
      lat: p.lat,
      note: p.note,
      author: p.author,
    };
    return addPlaceFs(input);
  };

  const removePlace = async (id: string) => removePlaceFs(id);

  const addPost = async (p: Partial<FeedPost>) => {
    const input: NewPostInput = {
      uid,
      author: p.author ?? "Gezgin",
      text: p.text ?? "",
      placeLabel: p.placeLabel,
      lng: p.lng,
      lat: p.lat,
    };
    await addPostFs(input);
  };

  const removePost = async (id: string) => removePostFs(id);

  const addReply = async (postId: string, author: string, text: string) => {
    await addReplyFs(postId, author, text);
  };

  const toggleLike = async (postId: string) => {
    await togglePostLikeFs(postId, uid);
  };

  const addStory = async (s: Partial<Story>) => {
    const input: NewStoryInput = {
      uid,
      author: s.author ?? "Gezgin",
      text: s.text ?? "",
      accent: s.accent ?? "leaf",
      placeLabel: s.placeLabel,
      lng: s.lng,
      lat: s.lat,
    };
    await addStoryFs(input);
  };

  const removeStory = async (id: string) => removeStoryFs(id);

  return {
    ready,
    error,
    clientId: clientId(),
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
