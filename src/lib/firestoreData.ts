/**
 * Atlasia — Firestore veri katmanı.
 * useAtlasData'nın bulut versiyonu: pinler, postlar, story'ler Firestore'da yaşar.
 *
 * Veri modeli:
 *   places/{placeId}                  — keşif pinleri (kullanıcı üretimi)
 *   posts/{postId}                    — sosyal akış gönderileri
 *   posts/{postId}.replies[]           — gönderi yanıtları (sınırlı gömülü liste)
 *   stories/{storyId}                 — 24 saat ömürlü hikâyeler
 *   users/{uid}/profile               — kullanıcı profili (XP, badges, takip)
 */
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";
import { db, firebaseConfigured } from "./firebase";
import { compressImageWithinLimit } from "../utils/image";
import type { FeedPost, FeedReply, Place, Story, StoryAccent, UploadPhotoKind } from "../types";

const COL_PLACES = "places";
const COL_POSTS = "posts";
const COL_STORIES = "stories";
const COL_USERS = "users";

export const FIRESTORE_LIMITS = {
  places: 250,
  posts: 100,
  stories: 100,
  likesPerPost: 500,
  repliesPerPost: 100,
} as const;

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
const STORY_EXPIRY_REFRESH_MS = 60 * 1000;

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
          authorUid: typeof r.authorUid === "string" ? r.authorUid : undefined,
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

/** Açık oturumda süresi dolan story'lerin de görünümden düşmesini sağlar. */
export function activeStories(stories: Story[], now = Date.now()): Story[] {
  const cutoff = now - STORY_TTL_MS;
  return stories.filter((story) => story.createdAt >= cutoff && story.createdAt <= now);
}

/** Tek bir kullanıcının üyeliğini değiştirir; bozuk/tekrarlı veriyi büyütmez. */
export function nextLikedBy(rawLikedBy: unknown, uid: string): string[] {
  const cleanUid = uid.trim();
  if (!cleanUid) throw dataError("auth/required", "Beğeni için geçerli hesap gerekli.");
  if (rawLikedBy !== undefined && !Array.isArray(rawLikedBy)) {
    throw dataError("post/likes-invalid", "Gönderinin beğeni verisi tutarsız.");
  }

  const likedBy = (rawLikedBy ?? []) as unknown[];
  if (!likedBy.every((value): value is string => typeof value === "string")) {
    throw dataError("post/likes-invalid", "Gönderinin beğeni verisi tutarsız.");
  }
  if (likedBy.length !== new Set(likedBy).size) {
    throw dataError("post/likes-invalid", "Gönderinin beğeni verisi tutarsız.");
  }

  const hasLiked = likedBy.includes(cleanUid);
  if (!hasLiked && likedBy.length >= FIRESTORE_LIMITS.likesPerPost) {
    throw dataError("post/likes-limit", "Bu gönderinin beğeni sınırına ulaşıldı.");
  }
  return hasLiked
    ? likedBy.filter((value) => value !== cleanUid)
    : [...likedBy, cleanUid];
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
  const q = query(
    collection(db, COL_PLACES),
    orderBy("createdAt", "desc"),
    limit(FIRESTORE_LIMITS.places),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizePlace(d.id, d.data()));
}

export function subscribePlaces(
  onChange: (places: Place[]) => void,
  onError?: (e: Error) => void,
): () => void {
  if (!db) return () => {};
  const q = query(
    collection(db, COL_PLACES),
    orderBy("createdAt", "desc"),
    limit(FIRESTORE_LIMITS.places),
  );
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
  const q = query(
    collection(db, COL_POSTS),
    orderBy("createdAt", "desc"),
    limit(FIRESTORE_LIMITS.posts),
  );
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

export async function togglePostLikeInFirestore(
  store: Firestore,
  postId: string,
  uid: string,
): Promise<void> {
  if (!uid.trim()) throw dataError("auth/required", "Beğeni için geçerli hesap gerekli.");

  const ref = doc(store, COL_POSTS, postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw dataError("post/not-found", "Gönderi bulunamadı.");

  const cleanUid = uid.trim();
  const current = snap.data().likedBy;
  const next = nextLikedBy(current, cleanUid);
  const isRemoval = Array.isArray(current) && next.length < current.length;
  await updateDoc(ref, {
    // Array transformu farklı kullanıcıların eşzamanlı değişikliklerini birleştirir.
    // `likes` örnek içeriğin sabit taban sayısı olarak değişmeden kalır.
    likedBy: isRemoval ? arrayRemove(cleanUid) : arrayUnion(cleanUid),
  });
}

export async function togglePostLike(postId: string, uid: string): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  return togglePostLikeInFirestore(db, postId, uid);
}

export async function addReplyInFirestore(
  store: Firestore,
  postId: string,
  uid: string,
  author: string,
  text: string,
): Promise<void> {
  const cleanUid = uid.trim();
  const cleanAuthor = author.trim();
  const cleanText = text.trim();
  if (!cleanUid) throw dataError("auth/required", "Yanıt için geçerli hesap gerekli.");
  if (!cleanAuthor || cleanAuthor.length > 100) {
    throw dataError("reply/author-invalid", "Yanıt yazarı geçersiz.");
  }
  if (!cleanText || cleanText.length > 1000) {
    throw dataError("reply/text-invalid", "Yanıt 1–1000 karakter olmalı.");
  }

  const ref = doc(store, COL_POSTS, postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw dataError("post/not-found", "Gönderi bulunamadı.");

  const rawReplies = snap.data().replies;
  if (rawReplies !== undefined && !Array.isArray(rawReplies)) {
    throw dataError("reply/data-invalid", "Gönderinin yanıt verisi tutarsız.");
  }
  const replies = (rawReplies ?? []) as FeedReply[];
  if (replies.length >= FIRESTORE_LIMITS.repliesPerPost) {
    throw dataError("reply/limit", "Bu gönderinin yanıt sınırına ulaşıldı.");
  }

  const next: FeedReply = {
    id: newId("fr"),
    author: cleanAuthor,
    authorUid: cleanUid,
    text: cleanText,
    createdAt: Date.now(),
    likes: 0,
    kind: "user",
  };
  // Array transformu, başka bir kullanıcının aynı anda eklediği yanıtı ezmez.
  await updateDoc(ref, { replies: arrayUnion(next) });
}

export async function addReply(
  postId: string,
  uid: string,
  author: string,
  text: string,
): Promise<void> {
  if (!db) throw dataError("data/unavailable", "Firestore hazır değil.");
  return addReplyInFirestore(db, postId, uid, author, text);
}

/* ─────────────────────────── Story'ler ─────────────────────────── */

export function subscribeStories(
  onChange: (stories: Story[]) => void,
  onError?: (e: Error) => void,
): () => void {
  if (!db) return () => {};

  const initialCutoff = Timestamp.fromMillis(Date.now() - STORY_TTL_MS);
  const q = query(
    collection(db, COL_STORIES),
    where("createdAt", ">=", initialCutoff),
    orderBy("createdAt", "desc"),
    limit(FIRESTORE_LIMITS.stories),
  );
  let latestStories: Story[] = [];
  const emitActiveStories = () => onChange(activeStories(latestStories));
  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      latestStories = snap.docs.map((d) => normalizeStory(d.id, d.data()));
      emitActiveStories();
    },
    onError,
  );
  const expiryTimer = globalThis.setInterval(emitActiveStories, STORY_EXPIRY_REFRESH_MS);

  return () => {
    globalThis.clearInterval(expiryTimer);
    unsubscribe();
  };
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

/* ─────────────────────────── Genel yardımcılar ─────────────────────────── */

/** Firestore aktif mi? */
export const isCloudReady = firebaseConfigured;
