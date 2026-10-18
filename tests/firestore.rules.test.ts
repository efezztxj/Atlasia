import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addReplyInFirestore,
  togglePostLikeInFirestore,
} from "../src/lib/firestoreData";

const PROJECT_ID = "demo-atlasia-rules";
let testEnv: RulesTestEnvironment;

function emulatorAddress() {
  const value = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const separator = value.lastIndexOf(":");
  return {
    host: value.slice(0, separator),
    port: Number(value.slice(separator + 1)),
  };
}

function validPlace(uid: string) {
  return {
    title: "Kordon keşfi",
    region: "İzmir",
    category: "cities",
    lng: 27.13,
    lat: 38.43,
    note: "Deniz kıyısında doğrulanmış bir keşif notu.",
    author: "Gezgin",
    authorUid: uid,
    kind: "user",
    createdAt: serverTimestamp(),
  };
}

function validPost(uid: string) {
  return {
    author: "Gezgin",
    authorUid: uid,
    text: "İzmir'den güvenli bir keşif notu.",
    createdAt: serverTimestamp(),
    likes: 0,
    likedBy: [],
    replies: [],
    kind: "user",
  };
}

function validStory(uid: string) {
  return {
    author: "Gezgin",
    authorUid: uid,
    text: "Gün batımı başladı.",
    accent: "dusk",
    createdAt: serverTimestamp(),
    seen: false,
    kind: "user",
  };
}

async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

describe("Firestore güvenlik kuralları", () => {
  beforeAll(async () => {
    setLogLevel("silent");
    const { host, port } = emulatorAddress();
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it("public tekil okumayı açar ama limitsiz koleksiyon sorgusunu reddeder", async () => {
    await seed("places/place-1", {
      ...validPlace("owner"),
      createdAt: Timestamp.now(),
    });
    const guestDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(guestDb, "places/place-1")));
    await assertFails(getDocs(collection(guestDb, "places")));
    await assertSucceeds(getDocs(query(collection(guestDb, "places"), limit(50))));
    await assertFails(getDocs(query(collection(guestDb, "places"), limit(51))));
  });

  it("viewport ve authorUid sorgularını küçük sayfalarda kabul eder", async () => {
    await seed("places/owner-in-view", {
      ...validPlace("owner"),
      lat: 38.43,
      lng: 27.13,
      createdAt: Timestamp.fromMillis(3_000),
    });
    await seed("places/other-in-view", {
      ...validPlace("other"),
      lat: 38.5,
      lng: 27.2,
      createdAt: Timestamp.fromMillis(2_000),
    });
    await seed("places/owner-outside", {
      ...validPlace("owner"),
      lat: 41.01,
      lng: 29.0,
      createdAt: Timestamp.fromMillis(1_000),
    });
    const guestDb = testEnv.unauthenticatedContext().firestore();

    const viewport = query(
      collection(guestDb, "places"),
      where("lat", ">=", 38),
      where("lat", "<=", 39),
      where("lng", ">=", 26),
      where("lng", "<=", 28),
      orderBy("lat", "asc"),
      orderBy("lng", "asc"),
      orderBy(documentId(), "asc"),
      limit(50),
    );
    const viewportSnapshot = await assertSucceeds(getDocs(viewport));
    expect(viewportSnapshot.docs.map((item) => item.id)).toEqual([
      "owner-in-view",
      "other-in-view",
    ]);

    const owned = query(
      collection(guestDb, "places"),
      where("authorUid", "==", "owner"),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      limit(50),
    );
    const ownedSnapshot = await assertSucceeds(getDocs(owned));
    expect(ownedSnapshot.docs.map((item) => item.id)).toEqual([
      "owner-in-view",
      "owner-outside",
    ]);
  });

  it("cursor sonraki sosyal sayfayı açar ama aşırı büyük isteği reddeder", async () => {
    for (let index = 0; index < 3; index += 1) {
      await seed(`posts/post-${index}`, {
        ...validPost(`owner-${index}`),
        createdAt: Timestamp.fromMillis(3_000 - index),
      });
    }
    const guestDb = testEnv.unauthenticatedContext().firestore();
    const firstQuery = query(
      collection(guestDb, "posts"),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      limit(2),
    );
    const first = await assertSucceeds(getDocs(firstQuery));
    expect(first.docs.map((item) => item.id)).toEqual(["post-0", "post-1"]);

    const second = await assertSucceeds(getDocs(query(
      collection(guestDb, "posts"),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      startAfter(first.docs.at(-1)!),
      limit(2),
    )));
    expect(second.docs.map((item) => item.id)).toEqual(["post-2"]);
    await assertSucceeds(getDocs(query(collection(guestDb, "posts"), limit(50))));
    await assertFails(getDocs(query(collection(guestDb, "posts"), limit(51))));
  });

  it("yalnız sahibi geçerli ve alanları sınırlı keşif pini yazabilir", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();
    const placeRef = doc(ownerDb, "places/place-1");

    await assertFails(setDoc(doc(guestDb, "places/guest"), validPlace("guest")));
    await assertFails(setDoc(doc(otherDb, "places/spoof"), validPlace("owner")));
    await assertFails(setDoc(doc(ownerDb, "places/extra"), {
      ...validPlace("owner"),
      moderationRole: "admin",
    }));
    await assertSucceeds(setDoc(placeRef, validPlace("owner")));
    await assertSucceeds(updateDoc(placeRef, { note: "Sahibinin güncellediği güvenli not." }));
    await assertFails(updateDoc(doc(otherDb, "places/place-1"), { note: "Yetkisiz değişiklik" }));
    await assertFails(deleteDoc(doc(otherDb, "places/place-1")));
    await assertSucceeds(deleteDoc(placeRef));
  });

  it("300 kelimelik pin notunu ve en fazla üç JPEG'i kabul eder; galeriyi sınırlar", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const jpg = (content: string) => `data:image/jpeg;base64,${content}`;
    const first = jpg("AQ==");
    const second = jpg("Ag==");
    const third = jpg("Aw==");
    const galleryPlace = { ...validPlace("owner"), photo: first, gallery: [second, third] };
    const placeRef = doc(ownerDb, "places/gallery");

    await assertSucceeds(setDoc(placeRef, galleryPlace));
    expect((await getDoc(placeRef)).data()?.gallery).toEqual([second, third]);
    await assertSucceeds(updateDoc(placeRef, { note: Array(300).fill("kelime").join(" ") }));
    await assertFails(updateDoc(doc(otherDb, "places/gallery"), { gallery: [third] }));
    await assertSucceeds(setDoc(doc(ownerDb, "places/legacy"), { ...validPlace("owner"), photo: first }));

    await assertFails(setDoc(doc(ownerDb, "places/no-cover"), { ...validPlace("owner"), gallery: [second] }));
    await assertFails(setDoc(doc(ownerDb, "places/empty"), { ...validPlace("owner"), photo: first, gallery: [] }));
    await assertFails(setDoc(doc(ownerDb, "places/four"), { ...galleryPlace, gallery: [second, third, jpg("BA==")] }));
    await assertFails(setDoc(doc(ownerDb, "places/duplicate"), { ...galleryPlace, gallery: [second, second] }));
    await assertFails(setDoc(doc(ownerDb, "places/wrong-type"), { ...galleryPlace, gallery: ["data:image/png;base64,Ag=="] }));
    await assertFails(setDoc(doc(ownerDb, "places/oversized"), { ...galleryPlace, gallery: [jpg("A".repeat(100000))] }));
    await assertFails(setDoc(doc(ownerDb, "places/long-note"), { ...validPlace("owner"), note: "x".repeat(5001) }));
  });

  it("doğrudan Firestore yazımında 300 kelimeyi kabul eder, 301'i create/update için reddeder", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const words = (count: number, separator: string) => Array(count).fill("kelime").join(separator);
    // JS /\S+/gu için tümü kelime ayırıcıdır; RE2 \s tek başına bunları kapsamaz.
    const unicodeSeparator = "\t\n\v\u00A0\u2028\u202F\u3000\uFEFF";
    const ref = doc(ownerDb, "places/word-boundary");

    await assertSucceeds(setDoc(ref, { ...validPlace("owner"), note: words(300, " ") }));
    await assertFails(setDoc(doc(ownerDb, "places/too-many-words"), {
      ...validPlace("owner"), note: words(301, " "),
    }));
    await assertSucceeds(updateDoc(ref, { note: words(300, unicodeSeparator) }));
    await assertFails(updateDoc(ref, { note: words(301, unicodeSeparator) }));
    await assertFails(setDoc(doc(ownerDb, "places/unicode-bypass"), {
      ...validPlace("owner"), note: words(301, "\u00A0"),
    }));
    await assertSucceeds(updateDoc(ref, { note: " \t\n\u00A0\uFEFF " }));
  });

  it("eski 300+ kelimelik pinin değişmeyen notunu korur, yeni notu sınırlı yazar", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const ref = doc(ownerDb, "places/legacy-note");
    const words = (count: number, separator: string) => Array(count).fill("kelime").join(separator);
    await seed("places/legacy-note", {
      ...validPlace("owner"),
      note: words(301, " "),
      createdAt: Timestamp.now(),
    });

    await assertSucceeds(updateDoc(ref, { title: "Eski pin korunur" }));
    await assertFails(updateDoc(ref, { note: words(301, "\n") }));
    await assertSucceeds(updateDoc(ref, { note: words(300, "\uFEFF") }));
  });

  it("post oluştururken sahiplik, başlangıç sayaçları ve alan beyaz listesini korur", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const postRef = doc(ownerDb, "posts/post-1");

    await assertFails(setDoc(doc(ownerDb, "posts/spoof"), validPost("other")));
    await assertFails(setDoc(doc(ownerDb, "posts/preliked"), {
      ...validPost("owner"),
      likes: 99,
    }));
    await assertFails(setDoc(doc(ownerDb, "posts/extra"), {
      ...validPost("owner"),
      role: "admin",
    }));
    await assertSucceeds(setDoc(postRef, validPost("owner")));
  });

  it("beğenide yalnız oturumdaki UID için tek ekleme veya çıkarma kabul eder", async () => {
    await seed("posts/post-1", {
      ...validPost("owner"),
      createdAt: Timestamp.now(),
    });
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const memberRef = doc(memberDb, "posts/post-1");
    const otherRef = doc(otherDb, "posts/post-1");

    await assertSucceeds(updateDoc(memberRef, { likedBy: ["member"] }));
    await assertFails(updateDoc(otherRef, { likedBy: ["member", "spoofed"] }));
    await assertFails(updateDoc(memberRef, { likedBy: ["member", "member"] }));
    await assertFails(updateDoc(memberRef, { likes: 500 }));
    await assertSucceeds(updateDoc(otherRef, { likedBy: ["member", "other"] }));
    await assertFails(updateDoc(memberRef, { likedBy: ["member"] }));
    await assertSucceeds(updateDoc(otherRef, { likedBy: ["member"] }));
    await assertSucceeds(updateDoc(memberRef, { likedBy: [] }));
  });

  it("yanıtı yalnız yeni, sahipli ve değiştirilemez bir kayıt olarak sona ekler", async () => {
    await seed("posts/post-1", {
      ...validPost("owner"),
      createdAt: Timestamp.now(),
    });
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const firstReply = {
      id: "reply-1",
      author: "Üye",
      authorUid: "member",
      text: "İlk güvenli yanıt.",
      createdAt: Date.now(),
      likes: 0,
      kind: "user",
    };

    await assertSucceeds(updateDoc(doc(memberDb, "posts/post-1"), { replies: [firstReply] }));
    await assertFails(updateDoc(doc(memberDb, "posts/post-1"), {
      replies: [{ ...firstReply, text: "Eski yanıt değiştirildi" }],
    }));
    await assertFails(updateDoc(doc(otherDb, "posts/post-1"), {
      replies: [firstReply, { ...firstReply, id: "reply-2", authorUid: "member" }],
    }));
    await assertSucceeds(updateDoc(doc(otherDb, "posts/post-1"), {
      replies: [
        firstReply,
        {
          ...firstReply,
          id: "reply-2",
          author: "Diğer üye",
          authorUid: "other",
          text: "İkinci güvenli yanıt.",
        },
      ],
    }));
  });

  it("eşzamanlı beğeni ve yanıt dönüşümlerinde iki kullanıcının verisini korur", async () => {
    await seed("posts/post-1", {
      ...validPost("owner"),
      createdAt: Timestamp.now(),
    });
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();

    await Promise.all([
      togglePostLikeInFirestore(memberDb, "post-1", "member"),
      togglePostLikeInFirestore(otherDb, "post-1", "other"),
    ]);
    let snapshot = await getDoc(doc(memberDb, "posts/post-1"));
    expect(new Set(snapshot.data()?.likedBy)).toEqual(new Set(["member", "other"]));
    expect(snapshot.data()?.likes).toBe(0);

    await Promise.all([
      addReplyInFirestore(memberDb, "post-1", "member", "Üye", "İlk eşzamanlı yanıt."),
      addReplyInFirestore(otherDb, "post-1", "other", "Diğer", "İkinci eşzamanlı yanıt."),
    ]);
    snapshot = await getDoc(doc(memberDb, "posts/post-1"));
    const replies = snapshot.data()?.replies as Array<{ authorUid: string }>;
    expect(replies).toHaveLength(2);
    expect(new Set(replies.map((reply) => reply.authorUid))).toEqual(
      new Set(["member", "other"]),
    );
  });

  it("sosyal dizi sınırlarının aşılmasını reddeder", async () => {
    const likedBy = Array.from({ length: 500 }, (_, index) => `member-${index}`);
    const replies = Array.from({ length: 100 }, (_, index) => ({
      id: `reply-${index}`,
      author: "Üye",
      authorUid: `member-${index}`,
      text: `Yanıt ${index}`,
      createdAt: Date.now() - index,
      likes: 0,
      kind: "user",
    }));
    await seed("posts/post-1", {
      ...validPost("owner"),
      createdAt: Timestamp.now(),
      likedBy,
      replies,
    });
    const memberDb = testEnv.authenticatedContext("new-member").firestore();

    await assertFails(updateDoc(doc(memberDb, "posts/post-1"), {
      likedBy: [...likedBy, "new-member"],
    }));
    await assertFails(updateDoc(doc(memberDb, "posts/post-1"), {
      replies: [
        ...replies,
        {
          id: "reply-over-limit",
          author: "Yeni üye",
          authorUid: "new-member",
          text: "Sınırı aşan yanıt.",
          createdAt: Date.now(),
          likes: 0,
          kind: "user",
        },
      ],
    }));
  });

  it("postu yalnız sahibi silebilir", async () => {
    await seed("posts/post-1", {
      ...validPost("owner"),
      createdAt: Timestamp.now(),
    });
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();

    await assertFails(deleteDoc(doc(otherDb, "posts/post-1")));
    await assertSucceeds(deleteDoc(doc(ownerDb, "posts/post-1")));
  });

  it("story'yi immutable tutar, sorguyu sınırlar ve yalnız sahibine sildirir", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();
    const storyRef = doc(ownerDb, "stories/story-1");

    await assertSucceeds(setDoc(storyRef, validStory("owner")));
    await assertFails(updateDoc(storyRef, { seen: true }));
    await assertFails(getDocs(collection(guestDb, "stories")));
    await assertSucceeds(getDocs(query(collection(guestDb, "stories"), limit(50))));
    await assertFails(getDocs(query(collection(guestDb, "stories"), limit(51))));
    await assertFails(deleteDoc(doc(otherDb, "stories/story-1")));
    await assertSucceeds(deleteDoc(storyRef));
  });

  it("emekliye ayrılan kullanıcı profili koleksiyonunu tamamen kapalı tutar", async () => {
    await seed("users/owner", { displayName: "Eski profil" });
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const profileRef = doc(ownerDb, "users/owner");

    await assertFails(getDoc(profileRef));
    await assertFails(getDocs(query(collection(ownerDb, "users"), limit(1))));
    await assertFails(setDoc(doc(ownerDb, "users/new"), { displayName: "Yeni profil" }));
    await assertFails(updateDoc(profileRef, { displayName: "Değiştirilemez" }));
    await assertFails(deleteDoc(profileRef));
  });
});
