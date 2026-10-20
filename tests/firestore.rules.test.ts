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
      memberUids: ["owner", "member"],
      joinCode: "123456",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Kurucu olmayan kullanıcı, sahipliği başkasına ait bir grubu açamaz.
    await assertFails(setDoc(doc(memberDb, "groups/spoofed"), valid));
    await assertFails(setDoc(doc(ownerDb, "groups/empty"), { ...valid, memberUids: [] }));
    await assertFails(setDoc(doc(ownerDb, "groups/too-many"), { ...valid, memberUids: Array.from({ length: 21 }, (_, index) => `member-${index}`) }));
    await assertFails(setDoc(doc(ownerDb, "groups/extra"), { ...valid, visibility: "public" }));
    // Katılma kodu zorunlu ve 4–8 hane olmalı.
    await assertFails(setDoc(doc(ownerDb, "groups/no-code"), {
      name: "Kapadokya ekibi",
      ownerUid: "owner",
      memberUids: ["owner"],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(ownerDb, "groups/short-code"), { ...valid, joinCode: "123" }));
    await assertFails(setDoc(doc(ownerDb, "groups/letter-code"), { ...valid, joinCode: "abcd" }));
    await assertSucceeds(setDoc(doc(ownerDb, "groups/group-1"), valid));

    await assertSucceeds(getDoc(doc(ownerDb, "groups/group-1")));
    await assertSucceeds(getDoc(doc(memberDb, "groups/group-1")));
    await assertFails(getDoc(doc(outsiderDb, "groups/group-1")));
    // Geniş koleksiyon taraması kapalı; listeleme kullanıcı indeksinden yapılır.
    await assertFails(getDocs(query(collection(outsiderDb, "groups"), limit(20))));
  });

  it("grup güncellemesini sahibine bırakır, üyeye yalnız son mesajı yazdırır", async () => {
    await seed("groups/group-1", {
      name: "Kapadokya ekibi",
      ownerUid: "owner",
      memberUids: ["owner", "member"],
      joinCode: "123456",
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

  it("gruba katılma kodu olmadan girilemez; kod yalnız kendini ekler", async () => {
    await seed("groups/group-1", {
      name: "Kapadokya ekibi",
      ownerUid: "owner",
      memberUids: ["owner", "member"],
      joinCode: "123456",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const outsiderDb = testEnv.authenticatedContext("outsider").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();

    // Kodsuz üyelik denemesi reddedilir.
    await assertFails(updateDoc(doc(outsiderDb, "groups/group-1"), {
      memberUids: ["owner", "member", "outsider"],
      updatedAt: serverTimestamp(),
    }));

    // Yanlış kodla katılma batch'i (iz + üyelik) atomik reddedilir.
    const badBatch = writeBatch(outsiderDb);
    badBatch.set(doc(outsiderDb, "groups/group-1/joinAttempts/outsider"), { code: "999999", at: serverTimestamp() });
    badBatch.update(doc(outsiderDb, "groups/group-1"), {
      memberUids: ["owner", "member", "outsider"],
      updatedAt: serverTimestamp(),
    });
    await assertFails(badBatch.commit());

    // Başkası adına doğrulama izi yazılamaz.
    await assertFails(setDoc(doc(outsiderDb, "groups/group-1/joinAttempts/other"), { code: "123456", at: serverTimestamp() }));

    // Doğru kod: yalnız kendini ekler.
    const joinBatch = writeBatch(outsiderDb);
    joinBatch.set(doc(outsiderDb, "groups/group-1/joinAttempts/outsider"), { code: "123456", at: serverTimestamp() });
    joinBatch.update(doc(outsiderDb, "groups/group-1"), {
      memberUids: ["owner", "member", "outsider"],
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(joinBatch.commit());

    // Yeni üye kodu değiştiremez; kurucu yenileyebilir.
    await assertFails(updateDoc(doc(outsiderDb, "groups/group-1"), { joinCode: "654321", updatedAt: serverTimestamp() }));
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    await assertSucceeds(updateDoc(doc(ownerDb, "groups/group-1"), { joinCode: "654321", updatedAt: serverTimestamp() }));

    // Doğrulama izleri başkalarına kapalı kalır.
    await assertFails(getDoc(doc(otherDb, "groups/group-1/joinAttempts/outsider")));
    await assertSucceeds(getDoc(doc(outsiderDb, "groups/group-1/joinAttempts/outsider")));
  });

  it("sohbet mesajını yalnız grup üyesi kendi adına yazar, sınırlı okur ve kendi mesajını siler", async () => {
    await seed("groups/group-1", {
      name: "Kapadokya ekibi",
      ownerUid: "owner",
      memberUids: ["owner", "member"],
      joinCode: "123456",
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
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const entry = {
      groupId: "group-1",
      name: "Kapadokya ekibi",
      role: "member",
      joinedAt: serverTimestamp(),
    };

    await assertFails(setDoc(doc(otherDb, "users/member/groups/group-1"), entry));
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

  it("public profil dizinini 20 kayitla listeler, yalniz sahibi yazar", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(setDoc(doc(guestDb, "userProfiles/alice"), { uid: "alice", displayName: "Alice", createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(bobDb, "userProfiles/alice"), { uid: "alice", displayName: "Alice", createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(aliceDb, "userProfiles/alice"), { uid: "alice", displayName: "A", createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(aliceDb, "userProfiles/alice"), { uid: "alice", displayName: "Alice", createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(bobDb, "userProfiles/bob"), { uid: "bob", displayName: "Bob", createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));

    await assertSucceeds(getDoc(doc(aliceDb, "userProfiles/bob")));
    await assertFails(getDoc(doc(guestDb, "userProfiles/alice")));
    await assertFails(getDocs(collection(aliceDb, "userProfiles")));
    await assertSucceeds(getDocs(query(collection(aliceDb, "userProfiles"), limit(20))));
    await assertSucceeds(getDocs(query(collection(aliceDb, "userProfiles"), limit(20))));
    await assertFails(getDocs(query(collection(aliceDb, "userProfiles"), limit(21))));

    await assertFails(updateDoc(doc(bobDb, "userProfiles/alice"), { displayName: "Alice2", updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(aliceDb, "userProfiles/alice"), { displayName: "Alice Updated", updatedAt: serverTimestamp(), createdAt: Timestamp.now() }));
    await assertFails(deleteDoc(doc(bobDb, "userProfiles/alice")));
    await assertSucceeds(deleteDoc(doc(aliceDb, "userProfiles/alice")));
  });

  it("arkadaslik istegini yalniz gonderen alicinin kuyruguna yazar, alici listeler ve her iki taraf silebilir", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const charlieDb = testEnv.authenticatedContext("charlie").firestore();

    // Gonderen kendi adina olusturur
    await assertSucceeds(setDoc(doc(aliceDb, "users/bob/friendRequests/alice"), { fromUid: "alice", fromName: "Alice", toUid: "bob", createdAt: serverTimestamp() }));
    // Baska kullanici adina yazamaz
    await assertFails(setDoc(doc(bobDb, "users/bob/friendRequests/alice"), { fromUid: "alice", fromName: "Alice", toUid: "bob", createdAt: serverTimestamp() }));
    // Kendine istek atamaz
    await assertFails(setDoc(doc(aliceDb, "users/alice/friendRequests/alice"), { fromUid: "alice", fromName: "Alice", toUid: "alice", createdAt: serverTimestamp() }));
    // Eksik alan
    await assertFails(setDoc(doc(aliceDb, "users/bob/friendRequests/bad"), { fromUid: "alice", toUid: "bob", createdAt: serverTimestamp() }));

    // Alici okuyabilir, baskasi okuyamaz
    await assertSucceeds(getDoc(doc(bobDb, "users/bob/friendRequests/alice")));
    await assertFails(getDoc(doc(aliceDb, "users/bob/friendRequests/alice")));
    await assertFails(getDoc(doc(charlieDb, "users/bob/friendRequests/alice")));
    await assertSucceeds(getDocs(query(collection(bobDb, "users/bob/friendRequests"), limit(50))));
    await assertFails(getDocs(collection(bobDb, "users/bob/friendRequests")));
    await assertFails(getDocs(query(collection(aliceDb, "users/bob/friendRequests"), limit(50))));

    // Alici ve gonderen silebilir
    await assertSucceeds(deleteDoc(doc(aliceDb, "users/bob/friendRequests/alice")));
    // Yeniden olustur
    await assertSucceeds(setDoc(doc(aliceDb, "users/bob/friendRequests/alice"), { fromUid: "alice", fromName: "Alice", toUid: "bob", createdAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(bobDb, "users/bob/friendRequests/alice")));
    await assertFails(updateDoc(doc(bobDb, "users/bob/friendRequests/alice"), { fromName: "Changed" } as never));
  });

  it("kabul edilmis arkadasligi yalniz users icindeki kisi olusturur, liste kapali, yalniz uyeler okur", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const charlieDb = testEnv.authenticatedContext("charlie").firestore();

    const valid = { users: ["alice", "bob"], requesterUid: "alice", recipientUid: "bob", status: "accepted", createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertFails(setDoc(doc(aliceDb, "friendships/alice_bob"), { ...valid, users: ["alice"] }));
    await assertFails(setDoc(doc(charlieDb, "friendships/alice_bob"), valid));
    await assertFails(setDoc(doc(aliceDb, "friendships/alice_bob"), { ...valid, status: "pending" }));
    await assertSucceeds(setDoc(doc(bobDb, "friendships/alice_bob"), valid));

    await assertSucceeds(getDoc(doc(aliceDb, "friendships/alice_bob")));
    await assertSucceeds(getDoc(doc(bobDb, "friendships/alice_bob")));
    await assertFails(getDoc(doc(charlieDb, "friendships/alice_bob")));
    await assertFails(getDocs(query(collection(aliceDb, "friendships"), limit(50))));
    await assertFails(updateDoc(doc(aliceDb, "friendships/alice_bob"), { status: "blocked" } as never));
    await assertFails(deleteDoc(doc(charlieDb, "friendships/alice_bob")));
    await assertSucceeds(deleteDoc(doc(aliceDb, "friendships/alice_bob")));
  });

  it("arkadas indeksini sahibi veya karsi taraf kabul sonrasi yazar, 100 kayitla listeler", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    // Alice kendi indeksini yazar
    await assertSucceeds(setDoc(doc(aliceDb, "users/alice/friends/bob"), { friendUid: "bob", friendName: "Bob", since: serverTimestamp() }));
    // Bob Alice'in indeksini dogrudan kabul sonrasi karsi taraf adina yazabilir (friendUid == auth.uid)
    await assertSucceeds(setDoc(doc(bobDb, "users/alice/friends/bob"), { friendUid: "bob", friendName: "Bob", since: serverTimestamp() }));
    // Yetkisiz yazamaz
    const charlieDb = testEnv.authenticatedContext("charlie").firestore();
    await assertFails(setDoc(doc(charlieDb, "users/alice/friends/bob"), { friendUid: "bob", friendName: "Bob", since: serverTimestamp() }));

    await assertSucceeds(getDoc(doc(aliceDb, "users/alice/friends/bob")));
    await assertFails(getDoc(doc(bobDb, "users/alice/friends/bob")));
    await assertSucceeds(getDocs(query(collection(aliceDb, "users/alice/friends"), limit(100))));
    await assertFails(getDocs(collection(aliceDb, "users/alice/friends")));
    await assertFails(getDocs(query(collection(aliceDb, "users/alice/friends"), limit(101))));
    await assertSucceeds(deleteDoc(doc(aliceDb, "users/alice/friends/bob")));
  });

  it("arkadaslik bildirim tiplerini kabul eder", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(aliceDb, "users/bob/notifications/n1"), { recipientUid: "bob", actorUid: "alice", type: "friend_request", title: "Arkadaslik istegi", body: "Alice seni eklemek istiyor.", targetId: "alice", read: false, createdAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(aliceDb, "users/bob/notifications/n2"), { recipientUid: "bob", actorUid: "alice", type: "friend_accepted", title: "Kabul edildi", body: "Bob kabul etti.", targetId: "bob", read: false, createdAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(aliceDb, "users/bob/notifications/n3"), { recipientUid: "bob", actorUid: "alice", type: "friend_declined", title: "Reddedildi", body: "Bob reddetti.", targetId: "bob", read: false, createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(aliceDb, "users/bob/notifications/bad"), { recipientUid: "bob", actorUid: "alice", type: "like", title: "x", body: "x", read: false, createdAt: serverTimestamp() }));
  });
});
