/**
 * Atlasia — Firestore veri katmanı.
 * useAtlasData'nın bulut versiyonu: pinler, postlar, story'ler Firestore'da yaşar.
 *
 * Veri modeli:
 *   places/{placeId}                  — keşif pinleri (kullanıcı üretimi)
 *   posts/{postId}                    — sosyal akış gönderileri
 *   posts/{postId}/replies/{replyId}   — gönderi yanıtları
 *   stories/{storyId}                 — 24 saat ömürlü hikâyeler
 *   users/{uid}/profile               — kullanıcı profili (XP, badges, takip)
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, firebaseConfigured } from "./firebase";
import { compressImage } from "../utils/image";
import type { FeedPost, FeedReply, Place, Story, StoryAccent } from "../types";

const STORAGE_PLACE_PHOTOS = "places";
const STORAGE_POST_PHOTOS = "posts";
const STORAGE_STORY_PHOTOS = "stories";

const COL_PLACES = "places";
const COL_POSTS = "posts";
const COL_STORIES = "stories";
const COL_USERS = "users";

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Firestore Timestamp'i veya number'ı güvenli şekilde number'a çevirir. */
function toMillis(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function normalizePlace(id: string, raw: DocumentData): Place {
  return {
    id,
    title: raw.title ?? "İsimsiz keşif",
    region: raw.region ?? "",
    category: raw.category ?? "nature",
    lng: typeof raw.lng === "number" ? raw.lng : 0,
    lat: typeof raw.lat === "number" ? raw.lat : 0,
    note: raw.note ?? "",
    image: raw.image,
    photo: raw.photo,
    gallery: raw.gallery,
    story: raw.story,
    author: raw.author ?? "Gezgin",
    kind: raw.kind === "guide" ? "guide" : "user",
    createdAt: toMillis(raw.createdAt),
  };
}

function normalizePost(id: string, raw: DocumentData): FeedPost {
  return {
    id,
    author: raw.author ?? "Gezgin",
    text: raw.text ?? "",
    createdAt: toMillis(raw.createdAt),
    likes: typeof raw.likes === "number" ? raw.likes : 0,
    likedBy: Array.isArray(raw.likedBy) ? (raw.likedBy as string[]) : [],
    placeLabel: raw.placeLabel,
    lng: typeof raw.lng === "number" ? raw.lng : undefined,
    lat: typeof raw.lat === "number" ? raw.lat : undefined,
    photo: raw.photo,
    replies: Array.isArray(raw.replies)
      ? (raw.replies as FeedReply[]).map((r) => ({
          id: r.id ?? newId("fr"),
          author: r.author ?? "Gezgin",
          text: r.text ?? "",
          createdAt: typeof r.createdAt === "number" ? r.createdAt : toMillis(r.createdAt),
          likes: typeof r.likes === "number" ? r.likes : 0,
          liked: r.liked === true,
          kind: r.kind === "user" ? "user" : "seed",
        }))
      : [],
    kind: raw.kind === "user" ? "user" : "seed",
  };
}

function normalizeStory(id: string, raw: DocumentData): Story {
  return {
    id,
    author: raw.author ?? "Gezgin",
    text: raw.text ?? "",
    accent: (raw.accent as StoryAccent) ?? "leaf",
    createdAt: toMillis(raw.createdAt),
    placeLabel: raw.placeLabel,
    lng: typeof raw.lng === "number" ? raw.lng : undefined,
    lat: typeof raw.lat === "number" ? raw.lat : undefined,
    photo: raw.photo,
    seen: raw.seen === true,
    kind: raw.kind === "user" ? "user" : "seed",
  };
}

/* ─────────────────────────── Fotoğraf yükleme ─────────────────────────── */

/** Dosyayı sıkıştırıp Firebase Storage'a yükler, indirilebilir URL döner. */
export async function uploadPhoto(file: File, folder: string, id: string): Promise<string> {
  if (!storage) throw new Error("Firebase Storage hazır değil.");
  const { dataUrl } = await compressImage(file, 860, 0.7);
  // dataUrl'i blob'a çevir
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const path = `${folder}/${id}/${Date.now()}.jpg`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, blob, { contentType: "image/jpeg" });
  return getDownloadURL(ref);
}

/** Storage URL'den dosya referansı çıkarır, silmek için kullanılır. */
async function deletePhoto(url: string): Promise<void> {
  if (!storage) return;
  try {
    const ref = storageRef(storage, url);
    await deleteObject(ref);
  } catch {
    /* zaten silinmiş olabilir, sessizce geç */
  }
}

/* ─────────────────────────── Kullanıcı profili ─────────────────────────── */

export interface UserProfile {
  uid: string;
  displayName: string;
  bio?: string;
  photoURL?: string;
  xp: number;
  level: number;
  badges: string[];
  following: string[];
  followers: string[];
  createdAt: number;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COL_USERS, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    displayName: data.displayName ?? "Gezgin",
    bio: data.bio,
    photoURL: data.photoURL,
    xp: typeof data.xp === "number" ? data.xp : 0,
    level: typeof data.level === "number" ? data.level : 1,
    badges: Array.isArray(data.badges) ? (data.badges as string[]) : [],
    following: Array.isArray(data.following) ? (data.following as string[]) : [],
    followers: Array.isArray(data.followers) ? (data.followers as string[]) : [],
    createdAt: toMillis(data.createdAt),
  };
}

export async function ensureUserProfile(uid: string, displayName: string): Promise<void> {
  if (!db) return;
  const ref = doc(db, COL_USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName,
      createdAt: serverTimestamp(),
      xp: 0,
      level: 1,
      badges: [],
      following: [],
      followers: [],
    });
  }
}

export async function awardXp(uid: string, amount: number): Promise<{ xp: number; level: number; leveledUp: boolean }> {
  if (!db) return { xp: 0, level: 1, leveledUp: false };
  const ref = doc(db, COL_USERS, uid);
  const snap = await getDoc(ref);
  const current = (snap.data()?.xp as number) ?? 0;
  const newXp = current + amount;
  const newLevel = Math.floor(Math.sqrt(newXp / 50)) + 1;
  const oldLevel = Math.floor(Math.sqrt(current / 50)) + 1;
  await updateDoc(ref, { xp: newXp, level: newLevel });
  return { xp: newXp, level: newLevel, leveledUp: newLevel > oldLevel };
}

export async function addBadge(uid: string, badge: string): Promise<boolean> {
  if (!db) return false;
  const ref = doc(db, COL_USERS, uid);
  const snap = await getDoc(ref);
  const existing = (snap.data()?.badges as string[]) ?? [];
  if (existing.includes(badge)) return false;
  await updateDoc(ref, { badges: [...existing, badge] });
  return true;
}

/* ─────────────────────────── Takip sistemi ─────────────────────────── */

export async function followUser(me: string, target: string): Promise<void> {
  if (!db || me === target) return;
  const meRef = doc(db, COL_USERS, me);
  const targetRef = doc(db, COL_USERS, target);
  const batch = writeBatch(db);
  const meSnap = await getDoc(meRef);
  const targetSnap = await getDoc(targetRef);
  const myFollowing = (meSnap.data()?.following as string[]) ?? [];
  const theirFollowers = (targetSnap.data()?.followers as string[]) ?? [];
  if (!myFollowing.includes(target)) {
    batch.update(meRef, { following: [...myFollowing, target] });
  }
  if (!theirFollowers.includes(me)) {
    batch.update(targetRef, { followers: [...theirFollowers, me] });
  }
  await batch.commit();
}

export async function unfollowUser(me: string, target: string): Promise<void> {
  if (!db || me === target) return;
  const meRef = doc(db, COL_USERS, me);
  const targetRef = doc(db, COL_USERS, target);
  const batch = writeBatch(db);
  const meSnap = await getDoc(meRef);
  const targetSnap = await getDoc(targetRef);
  const myFollowing = (meSnap.data()?.following as string[]) ?? [];
  const theirFollowers = (targetSnap.data()?.followers as string[]) ?? [];
  batch.update(meRef, { following: myFollowing.filter((u) => u !== target) });
  batch.update(targetRef, { followers: theirFollowers.filter((u) => u !== me) });
  await batch.commit();
}

/* ─────────────────────────── Pinler (places) ─────────────────────────── */

export async function listPlaces(uid?: string): Promise<Place[]> {
  if (!db) return [];
  // uid parametresi ileride özel pinler için kullanılacak (şu an tüm pinler herkese açık)
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  const q = query(collection(db, COL_PLACES), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizePlace(d.id, d.data()));
}

export function subscribePlaces(
  onChange: (places: Place[]) => void,
  onError?: (e: Error) => void,
): () => void {
  if (!db) return () => {};
  const q = query(collection(db, COL_PLACES), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => normalizePlace(d.id, d.data()))),
    onError,
  );
}

export interface NewPlaceInput {
  uid: string;
  title: string;
  region: string;
  category: Place["category"];
  lng: number;
  lat: number;
  note: string;
  author: string;
  photoFile?: File;
}

export async function addPlace(input: NewPlaceInput): Promise<Place> {
  if (!db) throw new Error("Firestore hazır değil.");
  const id = newId("p");
  let photoUrl: string | undefined;
  if (input.photoFile) {
    photoUrl = await uploadPhoto(input.photoFile, STORAGE_PLACE_PHOTOS, id);
  }
  const payload = {
    title: input.title,
    region: input.region,
    category: input.category,
    lng: input.lng,
    lat: input.lat,
    note: input.note,
    author: input.author,
    authorUid: input.uid,
    kind: "user",
    photo: photoUrl,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, COL_PLACES, id), payload);
  return { ...input, id, kind: "user", photo: photoUrl, createdAt: Date.now() } as Place;
}

export async function removePlace(id: string): Promise<void> {
  if (!db) return;
  const snap = await getDoc(doc(db, COL_PLACES, id));
  const photo = snap.data()?.photo as string | undefined;
  if (photo) await deletePhoto(photo);
  await deleteDoc(doc(db, COL_PLACES, id));
}

/* ─────────────────────────── Postlar ─────────────────────────── */

export function subscribePosts(
  onChange: (posts: FeedPost[]) => void,
  onError?: (e: Error) => void,
): () => void {
  if (!db) return () => {};
  const q = query(collection(db, COL_POSTS), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => normalizePost(d.id, d.data()))),
    onError,
  );
}

export interface NewPostInput {
  uid: string;
  author: string;
  text: string;
  placeLabel?: string;
  lng?: number;
  lat?: number;
  photoFile?: File;
}

export async function addPost(input: NewPostInput): Promise<string> {
  if (!db) throw new Error("Firestore hazır değil.");
  const id = newId("fp");
  let photoUrl: string | undefined;
  if (input.photoFile) {
    photoUrl = await uploadPhoto(input.photoFile, STORAGE_POST_PHOTOS, id);
  }
  const payload = {
    author: input.author,
    authorUid: input.uid,
    text: input.text,
    createdAt: serverTimestamp(),
    likes: 0,
    likedBy: [],
    placeLabel: input.placeLabel,
    lng: input.lng,
    lat: input.lat,
    photo: photoUrl,
    replies: [],
    kind: "user",
  };
  await setDoc(doc(db, COL_POSTS, id), payload);
  return id;
}

export async function removePost(id: string): Promise<void> {
  if (!db) return;
  const snap = await getDoc(doc(db, COL_POSTS, id));
  const photo = snap.data()?.photo as string | undefined;
  if (photo) await deletePhoto(photo);
  await deleteDoc(doc(db, COL_POSTS, id));
}

export async function togglePostLike(postId: string, uid: string): Promise<void> {
  if (!db) return;
  const ref = doc(db, COL_POSTS, postId);
  const snap = await getDoc(ref);
  const data = snap.data();
  const likedBy = (data?.likedBy as string[]) ?? [];
  const has = likedBy.includes(uid);
  await updateDoc(ref, {
    likedBy: has ? likedBy.filter((u) => u !== uid) : [...likedBy, uid],
    likes: (data?.likes as number) ?? 0 + (has ? -1 : 1),
  });
}

export async function addReply(postId: string, author: string, text: string): Promise<void> {
  if (!db) return;
  const ref = doc(db, COL_POSTS, postId);
  const snap = await getDoc(ref);
  const replies = (snap.data()?.replies as FeedReply[]) ?? [];
  const next: FeedReply = {
    id: newId("fr"),
    author,
    text,
    createdAt: Date.now(),
    likes: 0,
    kind: "user",
  };
  await updateDoc(ref, { replies: [...replies, next] });
}

/* ─────────────────────────── Story'ler ─────────────────────────── */

export function subscribeStories(
  onChange: (stories: Story[]) => void,
  onError?: (e: Error) => void,
): () => void {
  if (!db) return () => {};
  const q = query(collection(db, COL_STORIES), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => normalizeStory(d.id, d.data()))),
    onError,
  );
}

export interface NewStoryInput {
  uid: string;
  author: string;
  text: string;
  accent: StoryAccent;
  placeLabel?: string;
  lng?: number;
  lat?: number;
  photoFile?: File;
}

export async function addStory(input: NewStoryInput): Promise<string> {
  if (!db) throw new Error("Firestore hazır değil.");
  const id = newId("st");
  let photoUrl: string | undefined;
  if (input.photoFile) {
    photoUrl = await uploadPhoto(input.photoFile, STORAGE_STORY_PHOTOS, id);
  }
  await setDoc(doc(db, COL_STORIES, id), {
    author: input.author,
    authorUid: input.uid,
    text: input.text,
    accent: input.accent,
    placeLabel: input.placeLabel,
    lng: input.lng,
    lat: input.lat,
    photo: photoUrl,
    createdAt: serverTimestamp(),
    seen: false,
    kind: "user",
  });
  return id;
}

export async function removeStory(id: string): Promise<void> {
  if (!db) return;
  const snap = await getDoc(doc(db, COL_STORIES, id));
  const photo = snap.data()?.photo as string | undefined;
  if (photo) await deletePhoto(photo);
  await deleteDoc(doc(db, COL_STORIES, id));
}

export async function markStorySeen(id: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL_STORIES, id), { seen: true });
}

/* ─────────────────────────── Genel yardımcılar ─────────────────────────── */

/** Firestore aktif mi? */
export const isCloudReady = firebaseConfigured;
