import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  arrayUnion,
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
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addReplyInFirestore,
  removePostInFirestore,
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
    kind: "user",
  };
}

/* ─────────────── Arkadaşlık (açık rıza) yardımcıları ─────────────── */

/** Kurallardaki sortedPairId ile AYNI sıralamayı üretir. */
function pairIdFor(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/** validFriendshipShape'i sağlayan bekleyen istek belgesi. */
function validFriendship(requesterUid: string, recipientUid: string, requesterName = "Ada") {
  const [first, second] = requesterUid < recipientUid
    ? [requesterUid, recipientUid]
    : [recipientUid, requesterUid];
  return {
    requesterUid,
    recipientUid,
    participants: [first, second],
    status: "pending",
    requesterName,
    recipientName: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/** Kabul edilmiş arkadaşlık (seed için; timestamps gerçek olmalı). */
function acceptedFriendship(a: string, b: string) {
  const [first, second] = a < b ? [a, b] : [b, a];
  const requesterUid = a;
  const recipientUid = b;
  return {
    requesterUid,
    recipientUid,
    participants: [first, second],
    status: "accepted",
    requesterName: "Ada",
    recipientName: "Bora",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    acceptedAt: Timestamp.now(),
  };
}

/** validFriendshipMirror'i sağlayan own-scoped ayna belgesi. */
function validMirror(pairId: string, otherUid: string, direction: "outgoing" | "incoming", status: string, otherName = "") {
  return {
    pairId,
    otherUid,
    otherName,
    direction,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
    await assertFails(setDoc(doc(ownerDb, "posts/legacy-replies"), {
      ...validPost("owner"),
      replies: [],
    }));
    await assertSucceeds(setDoc(postRef, validPost("owner")));
  });

  it("yanıtları yazar sahipliği doğrulanan alt koleksiyonda tutar", async () => {
    await seed("posts/post-1", {
      ...validPost("owner"),
      createdAt: Timestamp.now(),
    });
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();
    const replyRef = doc(memberDb, "posts/post-1/replies/reply-1");
    const reply = {
      author: "Üye",
      authorUid: "member",
      text: "İlk güvenli yanıt.",
      createdAt: serverTimestamp(),
      kind: "user",
    };

    await assertSucceeds(setDoc(replyRef, reply));
    await assertSucceeds(getDoc(doc(guestDb, "posts/post-1/replies/reply-1")));
    await assertFails(updateDoc(replyRef, { text: "Eski yanıt değiştirildi" }));
    await assertFails(setDoc(doc(otherDb, "posts/post-1/replies/spoof"), {
      ...reply,
      authorUid: "member",
    }));
    await assertFails(setDoc(doc(memberDb, "posts/post-1/replies/extra"), {
      ...reply,
      admin: true,
    }));
    await assertSucceeds(deleteDoc(replyRef));
  });

  it("gönderi silinirken yanıt alt koleksiyonunu da batch ile temizler", async () => {
    await seed("posts/post-1", {
      ...validPost("owner"),
      createdAt: Timestamp.now(),
    });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all(["reply-1", "reply-2"].map((replyId) => setDoc(
        doc(firestore, `posts/post-1/replies/${replyId}`),
        {
          author: "Üye",
          authorUid: "member",
          text: "Test yanıtı",
          createdAt: Timestamp.now(),
          kind: "user",
        },
      )));
    });

    await removePostInFirestore(testEnv.authenticatedContext("owner").firestore(), "post-1");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      const parent = await getDoc(doc(firestore, "posts/post-1"));
      const replies = await getDocs(collection(firestore, "posts/post-1/replies"));
      expect(parent.exists()).toBe(false);
      expect(replies.empty).toBe(true);
    });
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
    const snapshot = await getDoc(doc(memberDb, "posts/post-1"));
    expect(new Set(snapshot.data()?.likedBy)).toEqual(new Set(["member", "other"]));
    expect(snapshot.data()?.likes).toBe(0);

    await Promise.all([
      addReplyInFirestore(memberDb, "post-1", "member", "Üye", "İlk eşzamanlı yanıt."),
      addReplyInFirestore(otherDb, "post-1", "other", "Diğer", "İkinci eşzamanlı yanıt."),
    ]);
    const replies = await getDocs(query(
      collection(memberDb, "posts/post-1/replies"),
      orderBy("createdAt", "asc"),
      limit(10),
    ));
    expect(replies.size).toBe(2);
    expect(new Set(replies.docs.map((reply) => reply.data().authorUid))).toEqual(
      new Set(["member", "other"]),
    );
  });

  it("beğeni tavanını ve yanıt sorgusu sayfa sınırını uygular", async () => {
    const likedBy = Array.from({ length: 500 }, (_, index) => `member-${index}`);
    await seed("posts/post-1", {
      ...validPost("owner"),
      createdAt: Timestamp.now(),
      likedBy,
    });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all(Array.from({ length: 101 }, (_, index) => setDoc(
        doc(firestore, `posts/post-1/replies/reply-${index}`),
        {
          author: "Üye",
          authorUid: `member-${index}`,
          text: `Yanıt ${index}`,
          createdAt: Timestamp.fromMillis(10_000 + index),
          kind: "user",
        },
      )));
    });
    const memberDb = testEnv.authenticatedContext("new-member").firestore();

    await assertFails(updateDoc(doc(memberDb, "posts/post-1"), {
      likedBy: [...likedBy, "new-member"],
    }));
    await assertSucceeds(getDocs(query(
      collection(memberDb, "posts/post-1/replies"),
      limit(100),
    )));
    await assertFails(getDocs(query(
      collection(memberDb, "posts/post-1/replies"),
      limit(101),
    )));
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
    await assertFails(setDoc(doc(ownerDb, "stories/story-with-global-seen"), {
      ...validStory("owner"),
      seen: false,
    }));
    await assertFails(updateDoc(storyRef, { seen: true }));
    await assertFails(getDocs(collection(guestDb, "stories")));
    await assertSucceeds(getDocs(query(collection(guestDb, "stories"), limit(50))));
    await assertFails(getDocs(query(collection(guestDb, "stories"), limit(51))));
    await assertFails(deleteDoc(doc(otherDb, "stories/story-1")));
    await assertSucceeds(deleteDoc(storyRef));
  });

  it("rotaları görünürlük seçimine, izleri ise yalnız sahibine açar", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();
    const routeBody = {
      id: "route-public",
      routeTitle: "Kordon yürüyüşü",
      routeSummary: "Kıyı rotası.",
      totalDurationHours: 2,
      totalDistanceKm: 3.2,
      transport: "walking",
      vibe: "Sakin",
      days: [],
      weatherNote: null,
      alternatives: [],
      createdAt: Date.now(),
    };
    const routeDocument = (visibility: string, routeId: string) => ({
      authorUid: "owner",
      visibility,
      route: { ...routeBody, id: routeId },
      saveCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(setDoc(doc(ownerDb, "routes/route-public"), routeDocument("public", "route-public")));
    await assertSucceeds(setDoc(doc(ownerDb, "routes/route-unlisted"), routeDocument("unlisted", "route-unlisted")));
    await assertSucceeds(setDoc(doc(ownerDb, "routes/route-private"), routeDocument("private", "route-private")));
    await assertFails(setDoc(doc(ownerDb, "routes/route-invalid-photo"), {
      ...routeDocument("public", "route-invalid-photo"),
      route: { ...routeBody, id: "route-invalid-photo", photo: "https://example.com/photo.jpg" },
    }));
    await assertSucceeds(getDoc(doc(guestDb, "routes/route-public")));
    await assertSucceeds(getDoc(doc(guestDb, "routes/route-unlisted")));
    await assertFails(getDoc(doc(guestDb, "routes/route-private")));
    await assertFails(getDoc(doc(otherDb, "routes/route-private")));
    await assertSucceeds(getDoc(doc(ownerDb, "routes/route-private")));
    await assertSucceeds(getDocs(query(collection(guestDb, "routes"), where("visibility", "==", "public"), limit(40))));
    await assertFails(getDocs(query(collection(guestDb, "routes"), limit(40))));
    await assertFails(updateDoc(doc(otherDb, "routes/route-public"), { visibility: "private" }));
    await assertSucceeds(updateDoc(doc(ownerDb, "routes/route-public"), {
      visibility: "private",
      updatedAt: serverTimestamp(),
    }));

    const track = {
      id: "track-1",
      authorUid: "owner",
      startedAt: 1_000,
      endedAt: 2_000,
      distanceKm: 1.1,
      polyline: "_p~iF~ps|U_ulLnnqC",
      stops: [],
      accuracy: { sampleCount: 2, meanMeters: 8, maxMeters: 12 },
      createdAt: serverTimestamp(),
    };
    await assertFails(setDoc(doc(otherDb, "tracks/track-1"), track));
    await assertSucceeds(setDoc(doc(ownerDb, "tracks/track-1"), track));
    await assertSucceeds(getDoc(doc(ownerDb, "tracks/track-1")));
    await assertFails(getDoc(doc(otherDb, "tracks/track-1")));
    await assertFails(getDoc(doc(guestDb, "tracks/track-1")));
    await assertFails(deleteDoc(doc(otherDb, "tracks/track-1")));
    await assertSucceeds(deleteDoc(doc(ownerDb, "tracks/track-1")));
  });

  it("savedPlaces ve savedRoutes bulut kayıtlarını UID altında özel tutar; profil belgesi kapalı kalır", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();
    const place = { id: "place-1", title: "Kordon", region: "İzmir" };

    await assertSucceeds(setDoc(doc(ownerDb, "users/owner/savedPlaces/place-1"), {
      place,
      savedAt: serverTimestamp(),
    }));
    const routeBody = {
      id: "route-1",
      routeTitle: "Kordon",
      routeSummary: "Kıyı yürüyüşü.",
      totalDurationHours: 1,
      totalDistanceKm: 1,
      transport: "walking",
      vibe: "Sakin",
      days: [],
      weatherNote: null,
      alternatives: [],
      createdAt: Date.now(),
    };
    await assertSucceeds(setDoc(doc(ownerDb, "routes/route-1"), {
      authorUid: "owner",
      visibility: "public",
      route: routeBody,
      saveCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    const addSavedRoute = writeBatch(ownerDb);
    addSavedRoute.set(doc(ownerDb, "users/owner/savedRoutes/route-1"), {
      routeId: "route-1",
      savedAt: serverTimestamp(),
    });
    addSavedRoute.update(doc(ownerDb, "routes/route-1"), { saveCount: 1, updatedAt: serverTimestamp() });
    await assertSucceeds(addSavedRoute.commit());

    await assertSucceeds(getDoc(doc(ownerDb, "users/owner/savedPlaces/place-1")));
    await assertFails(getDoc(doc(otherDb, "users/owner/savedPlaces/place-1")));
    await assertFails(getDoc(doc(guestDb, "users/owner/savedRoutes/route-1")));
    await assertFails(setDoc(doc(otherDb, "users/owner/savedRoutes/route-2"), {
      routeId: "route-2",
      savedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(ownerDb, "users/owner/savedRoutes/spoof"), {
      routeId: "different-id",
      savedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(ownerDb, "routes/route-1"), { saveCount: 9, updatedAt: serverTimestamp() }));

    const removeSavedRoute = writeBatch(ownerDb);
    removeSavedRoute.delete(doc(ownerDb, "users/owner/savedRoutes/route-1"));
    removeSavedRoute.update(doc(ownerDb, "routes/route-1"), { saveCount: 0, updatedAt: serverTimestamp() });
    await assertSucceeds(removeSavedRoute.commit());
  });

  it("grubu yalnız kurucu oluşturur, yalnız üyeler tek belge olarak okur", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const outsiderDb = testEnv.authenticatedContext("outsider").firestore();
    const valid = {
      name: "Kapadokya ekibi",
      ownerUid: "owner",
      memberUids: ["owner"],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Kurucu olmayan kullanıcı, sahipliği başkasına ait bir grubu açamaz.
    await assertFails(setDoc(doc(memberDb, "groups/spoofed"), valid));
    await assertFails(setDoc(doc(ownerDb, "groups/empty"), { ...valid, memberUids: [] }));
    await assertFails(setDoc(doc(ownerDb, "groups/too-many"), { ...valid, memberUids: Array.from({ length: 21 }, (_, index) => `member-${index}`) }));
    await assertFails(setDoc(doc(ownerDb, "groups/extra"), { ...valid, visibility: "public" }));
    // RIZA (2026-10-22 sertleştirmesi): kuruluş anında başkasını doğrudan
    // eklemek kapalıdır; üye listesi tam olarak [kurucu] olmalıdır.
    await assertFails(setDoc(doc(ownerDb, "groups/direct-add"), { ...valid, memberUids: ["owner", "member"] }));
    await assertSucceeds(setDoc(doc(ownerDb, "groups/group-1"), valid));

    await assertSucceeds(getDoc(doc(ownerDb, "groups/group-1")));
    // Üye olmayan (henüz daveti kabul etmemiş) kullanıcı grubu okuyamaz.
    await assertFails(getDoc(doc(memberDb, "groups/group-1")));
    await assertFails(getDoc(doc(outsiderDb, "groups/group-1")));
    // Üyelik ancak kabul edilmiş arkadaşlığın kendini eklemesiyle kazanılır.
    await seed("friendships/member_owner", acceptedFriendship("member", "owner"));
    await assertSucceeds(updateDoc(doc(memberDb, "groups/group-1"), {
      memberUids: arrayUnion("member"),
      updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(doc(memberDb, "groups/group-1")));
    // Geniş koleksiyon taraması kapalı; listeleme kullanıcı indeksinden yapılır.
    await assertFails(getDocs(query(collection(outsiderDb, "groups"), limit(20))));
  });

  it("grup güncellemesini sahibine bırakır, üyeye yalnız son mesajı yazdırır", async () => {
    await seed("groups/group-1", {
      name: "Kapadokya ekibi",
      ownerUid: "owner",
      memberUids: ["owner", "member"],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const outsiderDb = testEnv.authenticatedContext("outsider").firestore();

    await assertSucceeds(updateDoc(doc(ownerDb, "groups/group-1"), {
      name: "Kapadokya 2026",
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(memberDb, "groups/group-1"), { name: "Ele geçirildi", updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(memberDb, "groups/group-1"), {
      lastMessage: {
        text: "Yarın 09:00'da buluşalım.",
        senderUid: "member",
        senderName: "Üye",
        createdAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(memberDb, "groups/group-1"), {
      lastMessage: {
        text: "Sahte gönderen",
        senderUid: "owner",
        senderName: "Üye",
        createdAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(outsiderDb, "groups/group-1"), {
      lastMessage: {
        text: "Yetkisiz",
        senderUid: "outsider",
        senderName: "Yabancı",
        createdAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    }));
  });

  it("sohbet mesajını yalnız grup üyesi kendi adına yazar, sınırlı okur ve kendi mesajını siler", async () => {
    await seed("groups/group-1", {
      name: "Kapadokya ekibi",
      ownerUid: "owner",
      memberUids: ["owner", "member"],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const outsiderDb = testEnv.authenticatedContext("outsider").firestore();
    const valid = {
      senderUid: "member",
      senderName: "Üye",
      text: "Selam, yarın görüşelim.",
      createdAt: serverTimestamp(),
    };

    await assertFails(setDoc(doc(outsiderDb, "groups/group-1/messages/out"), valid));
    await assertFails(setDoc(doc(memberDb, "groups/group-1/messages/spoofed"), { ...valid, senderUid: "owner" }));
    await assertFails(setDoc(doc(memberDb, "groups/group-1/messages/empty"), { ...valid, text: "" }));
    await assertSucceeds(setDoc(doc(memberDb, "groups/group-1/messages/m-1"), valid));
    await assertSucceeds(setDoc(doc(ownerDb, "groups/group-1/messages/m-2"), {
      senderUid: "owner",
      senderName: "Kurucu",
      text: "Görüşürüz.",
      createdAt: serverTimestamp(),
    }));

    await assertSucceeds(getDocs(query(collection(memberDb, "groups/group-1/messages"), limit(50))));
    await assertFails(getDocs(collection(memberDb, "groups/group-1/messages")));
    await assertFails(getDocs(query(collection(outsiderDb, "groups/group-1/messages"), limit(50))));
    await assertFails(updateDoc(doc(memberDb, "groups/group-1/messages/m-1"), { text: "Değiştirildi" }));
    await assertFails(deleteDoc(doc(ownerDb, "groups/group-1/messages/m-1")));
    await assertSucceeds(deleteDoc(doc(memberDb, "groups/group-1/messages/m-1")));
  });

  it("grup indeksini yalnız sahibi yazar ve sınırlı listeler", async () => {
    // 2026-10-22 sertleştirmesi: indeks artık GERÇEK üyeliği yansıtmak zorunda.
    // Bu yüzden önce grup belgesi tohumlanır; üye olmayan indekse yazamaz.
    await seed("groups/group-1", {
      name: "Kapadokya ekibi",
      ownerUid: "owner",
      memberUids: ["owner", "member"],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const entry = {
      groupId: "group-1",
      name: "Kapadokya ekibi",
      role: "member",
      joinedAt: serverTimestamp(),
    };

    await assertFails(setDoc(doc(otherDb, "users/member/groups/group-1"), entry));
    // Rol, grup belgesindeki sahiplikle tutarlı olmalıdır: member sahibi gibi
    // davranamaz, sahip de member rolüyle yazamaz.
    await assertFails(setDoc(doc(memberDb, "users/member/groups/group-1"), { ...entry, role: "owner" }));
    await assertFails(setDoc(doc(memberDb, "users/member/groups/group-1"), { ...entry, role: "admin" }));
    await assertSucceeds(setDoc(doc(memberDb, "users/member/groups/group-1"), entry));
    await assertSucceeds(getDocs(query(collection(memberDb, "users/member/groups"), limit(20))));
    await assertFails(getDocs(query(collection(memberDb, "users/member/groups"), limit(21))));
    await assertFails(deleteDoc(doc(otherDb, "users/member/groups/group-1")));
    await assertSucceeds(deleteDoc(doc(memberDb, "users/member/groups/group-1")));
  });

  it("tazelik doğrulamasını yalnız kendi adına yazar, herkes sınırlı sayfada okur", async () => {
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();
    const valid = {
      placeId: "place-1",
      uid: "member",
      status: "still_open",
      note: "Giriş hâlâ açık.",
      createdAt: serverTimestamp(),
    };

    await assertFails(setDoc(doc(guestDb, "verifications/guest"), valid));
    await assertFails(setDoc(doc(memberDb, "verifications/spoofed"), { ...valid, uid: "other" }));
    await assertFails(setDoc(doc(memberDb, "verifications/bad-status"), { ...valid, status: "harika" }));
    await assertFails(setDoc(doc(memberDb, "verifications/extra"), { ...valid, xp: 50 }));
    await assertSucceeds(setDoc(doc(memberDb, "verifications/vr-1"), valid));

    await assertSucceeds(getDoc(doc(guestDb, "verifications/vr-1")));
    await assertFails(getDocs(collection(guestDb, "verifications")));
    await assertSucceeds(getDocs(query(collection(guestDb, "verifications"), limit(50))));
    await assertFails(getDocs(query(collection(guestDb, "verifications"), limit(51))));
    await assertFails(updateDoc(doc(memberDb, "verifications/vr-1"), { status: "closed" }));
    await assertFails(deleteDoc(doc(otherDb, "verifications/vr-1")));
    await assertSucceeds(deleteDoc(doc(memberDb, "verifications/vr-1")));
  });

  it("içerik bildirimini yalnız oturum sahibi adına ve sınırlı alanlarla kabul eder", async () => {
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();
    const valid = {
      reporterUid: "member",
      targetType: "post",
      targetId: "post-1",
      targetOwnerUid: "owner",
      reason: "spam",
      details: "Tekrarlanan reklam bağlantısı.",
      createdAt: serverTimestamp(),
    };

    await assertFails(setDoc(doc(guestDb, "reports/guest-report"), valid));
    await assertFails(setDoc(doc(memberDb, "reports/spoofed"), { ...valid, reporterUid: "other" }));
    await assertFails(setDoc(doc(memberDb, "reports/bad-reason"), { ...valid, reason: "begenmedim" }));
    await assertFails(setDoc(doc(memberDb, "reports/bad-target"), { ...valid, targetType: "comment" }));
    await assertFails(setDoc(doc(memberDb, "reports/extra-field"), { ...valid, status: "approved" }));
    await assertSucceeds(setDoc(doc(memberDb, "reports/report-1"), valid));

    await assertSucceeds(getDoc(doc(memberDb, "reports/report-1")));
    await assertFails(getDoc(doc(otherDb, "reports/report-1")));
    await assertFails(getDocs(query(collection(memberDb, "reports"), where("reporterUid", "==", "member"))));
    await assertSucceeds(getDocs(query(collection(memberDb, "reports"), where("reporterUid", "==", "member"), limit(50))));
    await assertFails(updateDoc(doc(memberDb, "reports/report-1"), { reason: "other" }));
    await assertFails(deleteDoc(doc(otherDb, "reports/report-1")));
    await assertSucceeds(deleteDoc(doc(memberDb, "reports/report-1")));
  });

  it("engellemeyi yalnız kendi adına, kendini engellemeden yazar", async () => {
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const valid = {
      blockerUid: "member",
      blockedUid: "spammer",
      createdAt: serverTimestamp(),
    };

    await assertFails(setDoc(doc(memberDb, "blocks/spoofed"), { ...valid, blockerUid: "other" }));
    await assertFails(setDoc(doc(memberDb, "blocks/self"), { ...valid, blockedUid: "member" }));
    await assertFails(setDoc(doc(memberDb, "blocks/extra"), { ...valid, reason: "dislike" }));
    await assertSucceeds(setDoc(doc(memberDb, "blocks/member_spammer"), valid));

    await assertSucceeds(getDoc(doc(memberDb, "blocks/member_spammer")));
    await assertFails(getDoc(doc(otherDb, "blocks/member_spammer")));
    await assertFails(getDocs(query(collection(memberDb, "blocks"), where("blockerUid", "==", "member"))));
    await assertSucceeds(getDocs(query(collection(memberDb, "blocks"), where("blockerUid", "==", "member"), limit(50))));
    await assertFails(updateDoc(doc(memberDb, "blocks/member_spammer"), { blockedUid: "someone-else" }));
    await assertFails(deleteDoc(doc(otherDb, "blocks/member_spammer")));
    await assertSucceeds(deleteDoc(doc(memberDb, "blocks/member_spammer")));
  });

  it("bildirimi yalnız alıcı okur, yalnız aktör yazar ve okundu alanı dışında değiştirilemez", async () => {
    const senderDb = testEnv.authenticatedContext("sender").firestore();
    const recipientDb = testEnv.authenticatedContext("recipient").firestore();
    const intruderDb = testEnv.authenticatedContext("intruder").firestore();
    const note = {
      recipientUid: "recipient",
      actorUid: "sender",
      type: "report_received",
      title: "İçeriğin bildirildi",
      body: "İnceleme sonrası sonuç bildirilecek.",
      targetId: "post-1",
      read: false,
      createdAt: serverTimestamp(),
    };

    await assertSucceeds(setDoc(doc(senderDb, "users/recipient/notifications/note-1"), note));
    // Başkasının kimliğiyle (sender adına) bildirim yazılamaz.
    await assertFails(setDoc(doc(intruderDb, "users/recipient/notifications/forged"), note));
    await assertFails(setDoc(doc(senderDb, "users/recipient/notifications/preloaded"), { ...note, read: true }));

    await assertSucceeds(getDoc(doc(recipientDb, "users/recipient/notifications/note-1")));
    await assertFails(getDoc(doc(senderDb, "users/recipient/notifications/note-1")));
    await assertSucceeds(getDocs(query(collection(recipientDb, "users/recipient/notifications"), limit(50))));
    await assertFails(getDocs(collection(recipientDb, "users/recipient/notifications")));

    await assertSucceeds(updateDoc(doc(recipientDb, "users/recipient/notifications/note-1"), { read: true }));
    await assertFails(updateDoc(doc(recipientDb, "users/recipient/notifications/note-1"), { title: "Değiştirildi" }));
    await assertFails(updateDoc(doc(senderDb, "users/recipient/notifications/note-1"), { read: false }));
    await assertFails(deleteDoc(doc(senderDb, "users/recipient/notifications/note-1")));
    await assertSucceeds(deleteDoc(doc(recipientDb, "users/recipient/notifications/note-1")));
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

  // ───────────────── Arkadaşlık · açık rıza (emülatör) ─────────────────
  // NOT: Bu vakalar Java 21 + Firestore Emulator gerektirir. Görevi yürüten
  // sandbox'ta Java YOK, bu yüzden bu tur ÇALIŞTIRILAMADI; CI'da koşar.

  it("arkadaşlık kaydını yalnız iki taraf okur, koleksiyon listesi kapalıdır", async () => {
    await seed("friendships/alice_bob", acceptedFriendship("alice", "bob"));
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const strangerDb = testEnv.authenticatedContext("stranger").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(aliceDb, "friendships/alice_bob")));
    await assertSucceeds(getDoc(doc(bobDb, "friendships/alice_bob")));
    // Taraf olmayan okuyamaz: görünür ad sızamaz.
    await assertFails(getDoc(doc(strangerDb, "friendships/alice_bob")));
    await assertFails(getDoc(doc(guestDb, "friendships/alice_bob")));
    // Enumeration kapalı.
    await assertFails(getDocs(query(collection(aliceDb, "friendships"), limit(50))));
  });

  it("isteği yalnız isteyen kendi adına oluşturur; alıcı adına istek yazılamaz", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(setDoc(doc(aliceDb, "friendships/alice_bob"), validFriendship("alice", "bob")));
    await testEnv.clearFirestore();

    // Bob, Alice adına istek açamaz (requesterUid != auth.uid).
    await assertFails(setDoc(doc(bobDb, "friendships/alice_bob"), validFriendship("alice", "bob")));
    // Kendine istek de açılamaz.
    await assertFails(setDoc(doc(aliceDb, "friendships/alice_alice"), validFriendship("alice", "alice")));
  });

  it("belge kimliği deterministik sıralı çift olmalıdır; yanlış pairId reddedilir", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    // Doğru kimlik "alice_bob"; tersten yazılmış kimlik reddedilmeli.
    await assertFails(setDoc(doc(aliceDb, "friendships/bob_alice"), validFriendship("alice", "bob")));
    await assertSucceeds(setDoc(doc(aliceDb, `friendships/${pairIdFor("alice", "bob")}`), validFriendship("alice", "bob")));
  });

  it("istek yalnız pending olarak açılır; doğrudan accepted yazılamaz", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const forged = { ...validFriendship("alice", "bob"), status: "accepted", acceptedAt: serverTimestamp() };
    await assertFails(setDoc(doc(aliceDb, "friendships/alice_bob"), forged));
  });

  it("engelleme iki yönde de istek oluşturmayı keser", async () => {
    // Bob, Alice'i engelledi → Alice istek gönderemez.
    await seed("blocks/bob_alice", { blockerUid: "bob", blockedUid: "alice", createdAt: Timestamp.now() });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(aliceDb, "friendships/alice_bob"), validFriendship("alice", "bob")));

    await testEnv.clearFirestore();
    // Alice, Bob'u engelledi → yine gönderemez.
    await seed("blocks/alice_bob", { blockerUid: "alice", blockedUid: "bob", createdAt: Timestamp.now() });
    await assertFails(setDoc(doc(aliceDb, "friendships/alice_bob"), validFriendship("alice", "bob")));
  });

  it("kabulü YALNIZ alıcı verebilir; isteyen kendi isteğini kabul edemez", async () => {
    await seed("friendships/alice_bob", {
      ...validFriendship("alice", "bob"),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const strangerDb = testEnv.authenticatedContext("stranger").firestore();

    const accept = {
      status: "accepted",
      recipientName: "Bora",
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    // İstek sahibi kendi isteğini kabul edemez — rıza tek taraflı üretilemez.
    await assertFails(updateDoc(doc(aliceDb, "friendships/alice_bob"), accept));
    // Taraf olmayan hiç kabul edemez.
    await assertFails(updateDoc(doc(strangerDb, "friendships/alice_bob"), accept));
    // Alıcı kabul edebilir.
    await assertSucceeds(updateDoc(doc(bobDb, "friendships/alice_bob"), accept));
  });

  it("kabul sırasında kimlik, taraf listesi ve oluşturma anı değiştirilemez", async () => {
    await seed("friendships/alice_bob", {
      ...validFriendship("alice", "bob"),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertFails(updateDoc(doc(bobDb, "friendships/alice_bob"), {
      status: "accepted", recipientName: "Bora", acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(), requesterUid: "bob",
    }));
    await assertFails(updateDoc(doc(bobDb, "friendships/alice_bob"), {
      status: "accepted", recipientName: "Bora", acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(), participants: ["bob", "bob"],
    }));
    // Kabul edilmiş kayıt tekrar pending'e çekilemez (status yalnız pending'den geçer).
    await seed("friendships/carol_dave", {
      ...acceptedFriendship("carol", "dave"),
    });
    const daveDb = testEnv.authenticatedContext("dave").firestore();
    await assertFails(updateDoc(doc(daveDb, "friendships/carol_dave"), {
      status: "pending", updatedAt: serverTimestamp(),
    }));
  });

  it("kabul anında engelleme varsa rıza geçerli değildir", async () => {
    await seed("friendships/alice_bob", {
      ...validFriendship("alice", "bob"),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await seed("blocks/bob_alice", { blockerUid: "bob", blockedUid: "alice", createdAt: Timestamp.now() });
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(updateDoc(doc(bobDb, "friendships/alice_bob"), {
      status: "accepted", recipientName: "Bora", acceptedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
  });

  it("reddetme yalnız alıcıya açıktır ve declined durumu üretir", async () => {
    await seed("friendships/alice_bob", {
      ...validFriendship("alice", "bob"),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(updateDoc(doc(aliceDb, "friendships/alice_bob"), { status: "declined", updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(bobDb, "friendships/alice_bob"), { status: "declined", updatedAt: serverTimestamp() }));
  });

  it("silme iki tarafa açıktır, taraf olmayana kapalıdır", async () => {
    await seed("friendships/alice_bob", acceptedFriendship("alice", "bob"));
    const strangerDb = testEnv.authenticatedContext("stranger").firestore();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(deleteDoc(doc(strangerDb, "friendships/alice_bob")));
    await assertSucceeds(deleteDoc(doc(aliceDb, "friendships/alice_bob")));
  });

  it("own-scoped aynayı yalnız sahibi okur ve 50 kayıtla sınırlı listeler", async () => {
    await seed("users/alice/friendships/alice_bob", validMirror("alice_bob", "bob", "outgoing", "accepted", "Bora"));
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(getDoc(doc(aliceDb, "users/alice/friendships/alice_bob")));
    await assertFails(getDoc(doc(bobDb, "users/alice/friendships/alice_bob")));
    await assertSucceeds(getDocs(query(collection(aliceDb, "users/alice/friendships"), limit(50))));
    await assertFails(getDocs(query(collection(aliceDb, "users/alice/friendships"), limit(51))));
    await assertFails(getDocs(collection(aliceDb, "users/alice/friendships")));
  });

  it("karşı tarafın aynası ancak gerçek rıza kaydı varsa yazılabilir", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    // Rıza kaydı yokken Bob'a ayna yazılamaz (existsAfter başarısız).
    await assertFails(setDoc(
      doc(aliceDb, "users/bob/friendships/alice_bob"),
      validMirror("alice_bob", "alice", "incoming", "pending", "Ada"),
    ));
  });

  it("istek gönderen kendi ve karşı aynayı aynı batch'te yazabilir", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const batch = writeBatch(aliceDb);
    batch.set(doc(aliceDb, "friendships/alice_bob"), validFriendship("alice", "bob"));
    batch.set(doc(aliceDb, "users/alice/friendships/alice_bob"), validMirror("alice_bob", "bob", "outgoing", "pending"));
    batch.set(doc(aliceDb, "users/bob/friendships/alice_bob"), validMirror("alice_bob", "alice", "incoming", "pending", "Ada"));
    await assertSucceeds(batch.commit());
  });

  it("ayna kimliği rıza kaydıyla tutarsızsa reddedilir (sahte yön/karşı taraf)", async () => {
    await seed("friendships/alice_bob", {
      ...validFriendship("alice", "bob"),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    // Alice isteyendir; kendi aynası 'outgoing' olmalı, 'incoming' yazılamaz.
    await assertFails(setDoc(
      doc(aliceDb, "users/alice/friendships/alice_bob"),
      validMirror("alice_bob", "bob", "incoming", "pending"),
    ));
    // otherUid karşı taraf olmalı; üçüncü bir kimlik yazılamaz.
    await assertFails(setDoc(
      doc(aliceDb, "users/alice/friendships/alice_bob"),
      validMirror("alice_bob", "stranger", "outgoing", "pending"),
    ));
    // Ayna, rıza kaydının önüne geçip 'accepted' iddia edemez.
    await assertFails(setDoc(
      doc(aliceDb, "users/alice/friendships/alice_bob"),
      validMirror("alice_bob", "bob", "outgoing", "accepted"),
    ));
    // Doğru yazım geçer.
    await assertSucceeds(setDoc(
      doc(aliceDb, "users/alice/friendships/alice_bob"),
      validMirror("alice_bob", "bob", "outgoing", "pending"),
    ));
  });

  it("taraf olmayan kullanıcı hiçbir aynaya yazamaz", async () => {
    await seed("friendships/alice_bob", {
      ...validFriendship("alice", "bob"),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const strangerDb = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(setDoc(
      doc(strangerDb, "users/alice/friendships/alice_bob"),
      validMirror("alice_bob", "bob", "outgoing", "pending"),
    ));
  });

  it("kabul sonrası iki tarafın aynası accepted'a güncellenir", async () => {
    await seed("friendships/alice_bob", {
      ...validFriendship("alice", "bob"),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await seed("users/alice/friendships/alice_bob", {
      pairId: "alice_bob", otherUid: "bob", otherName: "", direction: "outgoing",
      status: "pending", createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    await seed("users/bob/friendships/alice_bob", {
      pairId: "alice_bob", otherUid: "alice", otherName: "Ada", direction: "incoming",
      status: "pending", createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    const batch = writeBatch(bobDb);
    batch.update(doc(bobDb, "friendships/alice_bob"), {
      status: "accepted", recipientName: "Bora", acceptedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    batch.update(doc(bobDb, "users/bob/friendships/alice_bob"), {
      otherName: "Ada", status: "accepted", updatedAt: serverTimestamp(),
    });
    batch.update(doc(bobDb, "users/alice/friendships/alice_bob"), {
      otherName: "Bora", status: "accepted", updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it("ayna güncellemesi kimlik alanlarını değiştiremez", async () => {
    await seed("friendships/alice_bob", acceptedFriendship("alice", "bob"));
    await seed("users/alice/friendships/alice_bob", {
      pairId: "alice_bob", otherUid: "bob", otherName: "Bora", direction: "outgoing",
      status: "accepted", createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(aliceDb, "users/alice/friendships/alice_bob"), {
      otherUid: "stranger", status: "accepted", updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(aliceDb, "users/alice/friendships/alice_bob"), {
      otherName: "Bora Y.", status: "accepted", updatedAt: serverTimestamp(),
    }));
  });

  it("rıza kaydı silindiğinde karşı tarafın aynası da temizlenebilir", async () => {
    await seed("friendships/alice_bob", acceptedFriendship("alice", "bob"));
    await seed("users/alice/friendships/alice_bob", {
      pairId: "alice_bob", otherUid: "bob", otherName: "Bora", direction: "outgoing",
      status: "accepted", createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    await seed("users/bob/friendships/alice_bob", {
      pairId: "alice_bob", otherUid: "alice", otherName: "Ada", direction: "incoming",
      status: "accepted", createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    // Rıza kaydı dururken karşı aynayı silmek yalnız own-scoped kurala takılır.
    await assertFails(deleteDoc(doc(aliceDb, "users/bob/friendships/alice_bob")));

    const batch = writeBatch(aliceDb);
    batch.delete(doc(aliceDb, "friendships/alice_bob"));
    batch.delete(doc(aliceDb, "users/alice/friendships/alice_bob"));
    batch.delete(doc(aliceDb, "users/bob/friendships/alice_bob"));
    await assertSucceeds(batch.commit());
  });

  it("grup davetini yalnız KABUL EDİLMİŞ arkadaş kendini ekleyerek kabul eder", async () => {
    await seed("groups/group-1", {
      name: "Kapadokya ekibi", ownerUid: "owner", memberUids: ["owner"],
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    const friendDb = testEnv.authenticatedContext("friend").firestore();
    const strangerDb = testEnv.authenticatedContext("stranger").firestore();

    // Arkadaşlık yokken kendini ekleyemez.
    await assertFails(updateDoc(doc(strangerDb, "groups/group-1"), {
      memberUids: arrayUnion("stranger"), updatedAt: serverTimestamp(),
    }));

    await seed("friendships/friend_owner", acceptedFriendship("friend", "owner"));

    // Kabul edilmiş arkadaş kendini ekleyebilir.
    await assertSucceeds(updateDoc(doc(friendDb, "groups/group-1"), {
      memberUids: arrayUnion("friend"), updatedAt: serverTimestamp(),
    }));
  });

  it("bekleyen (pending) arkadaşlık grup daveti için yeterli değildir", async () => {
    await seed("groups/group-1", {
      name: "Kapadokya ekibi", ownerUid: "owner", memberUids: ["owner"],
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    await seed("friendships/friend_owner", {
      ...validFriendship("owner", "friend"),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const friendDb = testEnv.authenticatedContext("friend").firestore();
    await assertFails(updateDoc(doc(friendDb, "groups/group-1"), {
      memberUids: arrayUnion("friend"), updatedAt: serverTimestamp(),
    }));
  });

  it("kendini ekleyen davetli başkasını ekleyemez, adı veya sahibi değiştiremez", async () => {
    await seed("groups/group-1", {
      name: "Kapadokya ekibi", ownerUid: "owner", memberUids: ["owner"],
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    await seed("friendships/friend_owner", acceptedFriendship("friend", "owner"));
    await seed("friendships/other_owner", acceptedFriendship("other", "owner"));
    const friendDb = testEnv.authenticatedContext("friend").firestore();

    // Başkasını da eklemek: toSet eşitliği bozulur → red.
    await assertFails(updateDoc(doc(friendDb, "groups/group-1"), {
      memberUids: arrayUnion("friend", "other"), updatedAt: serverTimestamp(),
    }));
    // Grup adını değiştirmek: affectedKeys sınırı → red.
    await assertFails(updateDoc(doc(friendDb, "groups/group-1"), {
      memberUids: arrayUnion("friend"), name: "Ele geçirildi", updatedAt: serverTimestamp(),
    }));
    // Sahibi değiştirmek: red.
    await assertFails(updateDoc(doc(friendDb, "groups/group-1"), {
      memberUids: arrayUnion("friend"), ownerUid: "friend", updatedAt: serverTimestamp(),
    }));
  });

  it("grup üyesi olmayan yabancı grup dokümanını okuyamaz", async () => {
    await seed("groups/group-1", {
      name: "Kapadokya ekibi", ownerUid: "owner", memberUids: ["owner"],
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    const strangerDb = testEnv.authenticatedContext("stranger").firestore();
    await assertFails(getDoc(doc(strangerDb, "groups/group-1")));
    await assertFails(getDocs(query(collection(strangerDb, "groups"), limit(20))));
  });

  it("friend_request ve friend_accepted bildirimleri alıcı adına yazılabilir", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(aliceDb, "users/bob/notifications/nt-1"), {
      recipientUid: "bob", actorUid: "alice", type: "friend_request",
      title: "Arkadaşlık isteği", body: "Ada seninle arkadaş olmak istiyor.",
      read: false, createdAt: serverTimestamp(), targetId: "alice_bob",
    }));
    await assertSucceeds(setDoc(doc(aliceDb, "users/bob/notifications/nt-2"), {
      recipientUid: "bob", actorUid: "alice", type: "friend_accepted",
      title: "Arkadaşlık kabul edildi", body: "Ada isteğini kabul etti.",
      read: false, createdAt: serverTimestamp(),
    }));
    // Aktör kendi adına yazmak zorunda; başkası adına yazılamaz.
    await assertFails(setDoc(doc(aliceDb, "users/bob/notifications/nt-3"), {
      recipientUid: "bob", actorUid: "stranger", type: "friend_request",
      title: "Sahte", body: "Sahte istek", read: false, createdAt: serverTimestamp(),
    }));
  });
  it("süresi dolmuş hikâyeyi yabancı okuyamaz, sahibi okur (kusur #5)", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();
    const expired = Timestamp.fromMillis(Date.now() - 25 * 60 * 60 * 1000);
    await seed("stories/old-1", { ...validStory("owner"), createdAt: expired });

    // 24 saat penceresi doldu: halka açık okuma kapanır.
    await assertFails(getDoc(doc(guestDb, "stories/old-1")));
    // Sahip kendi eski hikâyesini hâlâ okuyabilir (silme hakkı için).
    await assertSucceeds(getDoc(doc(ownerDb, "stories/old-1")));
    // Canlı hikâye herkese açık kalmaya devam eder.
    await seed("stories/live-1", validStory("owner"));
    await assertSucceeds(getDoc(doc(guestDb, "stories/live-1")));
  });

  it("grup lastMessage yazımı updatedAt olmadan reddedilir (kusur #1)", async () => {
    await seed("groups/group-1", {
      name: "Kapadokya ekibi", ownerUid: "owner", memberUids: ["owner", "member"],
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    const memberDb = testEnv.authenticatedContext("member").firestore();
    await assertFails(updateDoc(doc(memberDb, "groups/group-1"), {
      lastMessage: { text: "sa", senderUid: "member", senderName: "Üye", createdAt: serverTimestamp() },
    }));
  });

  it("silinmiş grubun mesajları kural hatasına düşmeden reddedilir (kusur #3)", async () => {
    await seed("groups/gone-1", {
      name: "Eski grup", ownerUid: "owner", memberUids: ["owner", "member"],
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    await seed("groups/gone-1/messages/m-1", {
      senderUid: "member", senderName: "Üye", text: "selam", createdAt: Timestamp.now(),
    });
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const memberDb = testEnv.authenticatedContext("member").firestore();
    await assertSucceeds(deleteDoc(doc(ownerDb, "groups/gone-1")));
    // Grup yok: üyelik listesi boş döner, istek temiz biçimde reddedilir.
    await assertFails(getDoc(doc(memberDb, "groups/gone-1/messages/m-1")));
  });
});
