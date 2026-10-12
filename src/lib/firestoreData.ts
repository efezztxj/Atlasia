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
  writeBatch,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db, firebaseConfigured } from "./firebase";
import { compressImageWithinLimit } from "../utils/image";
import type { FeedPost, FeedReply, Place, Story, StoryAccent, UploadPhotoKind } from "../types";

const COL_PLACES = "places";
const COL_POSTS = "posts";
const COL_STORIES = "stories";
const COL_USERS = "users";

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function dataError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

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
    authorUid: typeof raw.authorUid === "string" ? raw.authorUid : undefined,
    kind: raw.kind === "guide" ? "guide" : "user",
    createdAt: toMillis(raw.createdAt),
  };
}

function normalizePost(id: string, raw: DocumentData): FeedPost {
  return {
    id,
    author: raw.author ?? "Gezgin",
    authorUid: typeof raw.authorUid === "string" ? raw.authorUid : undefined,
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
    authorUid: typeof raw.authorUid === "string" ? raw.authorUid : undefined,
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

/* ─────────────────────────── Fotoğraf hazırlama ─────────────────────────── */

/**
 * Fotoğrafı Firestore'un ücretsiz kotasına uygun, sınırlandırılmış bir JPEG'e
 * dönüştürür. Veri URL'i ilgili içerikle aynı dokümana atomik olarak yazılır;
 * ayrı bir ücretli dosya depolama hizmeti gerekmez.
 */
export async function uploadPhoto(file: File, _kind: UploadPhotoKind): Promise<string> {
  const { dataUrl } = await compressImageWithinLimit(file);
  return dataUrl;
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

export async function listPlaces(_uid?: string): Promise<Place[]> {
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
  /** Fotoğraf daha önce uploadPhoto ile yüklendiyse doğrudan URL. */
  photoUrl?: string;
  photoFile?: File;
}

export async function addPlace(input: NewPlaceInput): Promise<Place> {
  if (!db) throw new Error("Firestore hazır değil.");
  const id = newId("p");
  let photoUrl = input.photoUrl;
  if (input.photoFile) {
    photoUrl = await uploadPhoto(input.photoFile, "place");
  }
  const payload: Record<string, unknown> = {
    title: input.title,
    region: input.region,
    category: input.category,
    lng: input.lng,
    lat: input.lat,
    note: input.note,
    author: input.author,
    authorUid: input.uid,
    kind: "user",
    createdAt: serverTimestamp(),
  };
  if (photoUrl) payload.photo = photoUrl;
  await setDoc(doc(db, COL_PLACES, id), payload);
  return {
    id,
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
    createdAt: Date.now(),
  };
}

export async function removePlace(id: string, uid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  const placeRef = doc(db, COL_PLACES, id);
  const snap = await getDoc(placeRef);
  if (!snap.exists()) return;

  const ownerUid = snap.data().authorUid as string | undefined;
  if (!ownerUid) throw dataError("place/owner-missing", "Bu eski izin sahiplik bilgisi eksik.");
  if (ownerUid !== uid) throw dataError("place/not-owner", "Bu iz başka bir hesaba ait.");

  // Fotoğraf aynı Firestore dokümanında bulunduğundan kayıt ve medya tek,
  // atomik silme işlemiyle birlikte kaldırılır.
  await deleteDoc(placeRef);
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
  photoUrl?: string;
  photoFile?: File;
}

export async function addPost(input: NewPostInput): Promise<string> {
  if (!db) throw new Error("Firestore hazır değil.");
  const id = newId("fp");
  let photoUrl = input.photoUrl;
  if (input.photoFile) {
    photoUrl = await uploadPhoto(input.photoFile, "post");
  }
  const payload: Record<string, unknown> = {
    author: input.author,
    authorUid: input.uid,
    text: input.text,
    createdAt: serverTimestamp(),
    likes: 0,
    likedBy: [],
    replies: [],
    kind: "user",
  };
  if (input.placeLabel) payload.placeLabel = input.placeLabel;
  if (input.lng !== undefined) payload.lng = input.lng;
  if (input.lat !== undefined) payload.lat = input.lat;
  if (photoUrl) payload.photo = photoUrl;
  await setDoc(doc(db, COL_POSTS, id), payload);
  return id;
}

export async function removePost(id: string): Promise<void> {
  if (!db) return;
  const postRef = doc(db, COL_POSTS, id);
  await deleteDoc(postRef);
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
  photoUrl?: string;
  photoFile?: File;
}

export async function addStory(input: NewStoryInput): Promise<string> {
  if (!db) throw new Error("Firestore hazır değil.");
  const id = newId("st");
  let photoUrl = input.photoUrl;
  if (input.photoFile) {
    photoUrl = await uploadPhoto(input.photoFile, "story");
  }
  const payload: Record<string, unknown> = {
    author: input.author,
    authorUid: input.uid,
    text: input.text,
    accent: input.accent,
    createdAt: serverTimestamp(),
    seen: false,
    kind: "user",
  };
  if (input.placeLabel) payload.placeLabel = input.placeLabel;
  if (input.lng !== undefined) payload.lng = input.lng;
  if (input.lat !== undefined) payload.lat = input.lat;
  if (photoUrl) payload.photo = photoUrl;
  await setDoc(doc(db, COL_STORIES, id), payload);
  return id;
}

export async function removeStory(id: string): Promise<void> {
  if (!db) return;
  const storyRef = doc(db, COL_STORIES, id);
  await deleteDoc(storyRef);
}

export async function markStorySeen(id: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COL_STORIES, id), { seen: true });
}

/* ─────────────────────────── Genel yardımcılar ─────────────────────────── */

/** Firestore aktif mi? */
export const isCloudReady = firebaseConfigured;
