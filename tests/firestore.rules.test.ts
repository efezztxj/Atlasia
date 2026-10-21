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

  it("henüz olmayan rota belgesinin ön okuması reddedilir; yayın ön okumasız oluşturulur (2026-10-21 üretim regresyonu)", async () => {
    // routes get kuralı resource.data okur. Belge yokken resource null olduğu için
    // sahibi dahil herkesin ön okuması permission-denied alır. İstemci bu reddi
    // "okunabilir rota yok" sayıp doğrudan create yazar; kurallar gevşetilmez.
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    await assertFails(getDoc(doc(ownerDb, "routes/route-henuz-yok")));

    // Kayıtlı yer ön okuması resource.data okumadığı için belge yokken de başarılıdır.
    await assertSucceeds(getDoc(doc(ownerDb, "users/owner/savedPlaces/yer-henuz-yok")));
    // joinGroup indeks ön kontrolü de belge yokken okunabilir (update kapalı olduğu için gerekli).
    await assertSucceeds(getDoc(doc(ownerDb, "users/owner/groups/grup-henuz-yok")));
    // Eksik/kısaltılmış grup kimliği: belge yok, kural yine reddeder (istemci Türkçe mesaja çevirir).
    await assertFails(getDoc(doc(ownerDb, "groups/Vwd76pz6")));

    // Yürüyüş kaydı taslağı (durak yok, origin alanı hiç yazılmamış) bağlantılı rota olarak oluşturulabilir.
    await assertSucceeds(setDoc(doc(ownerDb, "routes/route-yuruyus"), {
      authorUid: "owner",
      visibility: "unlisted",
      route: {
        id: "route-yuruyus",
        routeTitle: "Kayıtlı yürüyüş",
        routeSummary: "Yürüyüş kaydından oluşturulan özel taslak. Yaklaşık 0 km.",
        totalDurationHours: 0,
        totalDistanceKm: 0,
        transport: "walking",
        vibe: "Yürüyüş kaydı",
        days: [{ dayNumber: 1, title: "Yürüyüş", summary: "Kayıt sırasında tespit edilen duraklar.", stops: [], polyline: "" }],
        weatherNote: null,
        alternatives: [],
        createdAt: Date.now(),
      },
      saveCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(doc(ownerDb, "routes/route-yuruyus")));
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
      joinCode: "123456",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Kurucu olmayan kullanıcı, sahipliği başkasına ait bir grubu açamaz.
    await assertFails(setDoc(doc(memberDb, "groups/spoofed"), valid));
    await assertFails(setDoc(doc(ownerDb, "groups/empty"), { ...valid, memberUids: [] }));
    await assertFails(setDoc(doc(ownerDb, "groups/too-many"), { ...valid, memberUids: Array.from({ length: 21 }, (_, index) => `member-${index}`) }));
    await assertFails(setDoc(doc(ownerDb, "groups/extra"), { ...valid, visibility: "public" }));
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

  it("beğeni güncellemesi yalnız kendi UID'sidir; sayaç ve metin müdahaleleri reddedilir", async () => {
    await seed("posts/post-1", {
      ...validPost("owner"),
      createdAt: Timestamp.now(),
    });
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();

    // Başkası adına beğeni eklenemez, beğeni sayacı doğrudan yazılamaz.
    await assertFails(updateDoc(doc(memberDb, "posts/post-1"), { likedBy: arrayUnion("other") }));
    await assertFails(updateDoc(doc(memberDb, "posts/post-1"), { likes: 42 }));
    // Tam bir liste ezmesi (birden fazla üyelik değişimi) transform yerine geçmez.
    await assertFails(updateDoc(doc(memberDb, "posts/post-1"), { likedBy: ["member", "other"] }));
    // Update yalnız likedBy etkileşimidir: sahibi bile metni değiştiremez.
    await assertFails(updateDoc(doc(ownerDb, "posts/post-1"), { text: "Sonradan değiştirildi" }));
    // Oturumsuz beğeni yok; kendi adına tek ekleme serbest.
    await assertFails(updateDoc(doc(guestDb, "posts/post-1"), { likedBy: arrayUnion("guest") }));
    await assertSucceeds(updateDoc(doc(memberDb, "posts/post-1"), { likedBy: arrayUnion("member") }));
  });

  it("var olmayan gönderiye yanıt yazılamaz; yanıt silmede sahiplik matrisi geçerlidir", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const reply = {
      author: "Üye",
      authorUid: "member",
      text: "Yanıt metni.",
      createdAt: serverTimestamp(),
      kind: "user",
    };

    await assertFails(setDoc(doc(memberDb, "posts/yok/replies/reply-1"), reply));
    await assertFails(getDocs(query(collection(memberDb, "posts/yok/replies"), limit(10))));

    await seed("posts/post-1", {
      ...validPost("owner"),
      createdAt: Timestamp.now(),
    });
    await seed("posts/post-1/replies/reply-1", {
      ...reply,
      createdAt: Timestamp.now(),
    });
    // Üçüncü kişi silemez; gönderi sahibi moderasyon için silebilir.
    await assertFails(deleteDoc(doc(otherDb, "posts/post-1/replies/reply-1")));
    await assertSucceeds(deleteDoc(doc(ownerDb, "posts/post-1/replies/reply-1")));
  });

  it("kullanıcı altındaki engelleme listesi özeldir ve kimlik eşleşmesi zorunludur", async () => {
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();
    const valid = {
      blockerUid: "member",
      blockedUid: "spammer",
      createdAt: serverTimestamp(),
    };

    await assertSucceeds(setDoc(doc(memberDb, "users/member/blocks/spammer"), valid));
    // Belge kimliği engellenen kişiyle aynı olmalı; başkası adına blok yazılamaz.
    await assertFails(setDoc(doc(memberDb, "users/member/blocks/yanlis-id"), valid));
    await assertFails(setDoc(doc(otherDb, "users/member/blocks/biri"), {
      blockerUid: "member",
      blockedUid: "biri",
      createdAt: serverTimestamp(),
    }));
    await assertFails(getDoc(doc(otherDb, "users/member/blocks/spammer")));
    await assertFails(getDocs(query(collection(memberDb, "users/member/blocks"), limit(51))));
    await assertFails(updateDoc(doc(memberDb, "users/member/blocks/spammer"), { createdAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(memberDb, "users/member/blocks/spammer")));
  });

  it("kayıtlı yerler çapraz UID ile yazılamaz; place.id belge kimliğiyle eşleşmek zorundadır", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    const otherDb = testEnv.authenticatedContext("other").firestore();

    await assertFails(setDoc(doc(otherDb, "users/owner/savedPlaces/p1"), {
      place: { id: "p1", title: "Sahte" },
      savedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(ownerDb, "users/owner/savedPlaces/p1"), {
      place: { id: "baska-id", title: "Uyumsuz" },
      savedAt: serverTimestamp(),
    }));
    await assertSucceeds(setDoc(doc(ownerDb, "users/owner/savedPlaces/p1"), {
      place: { id: "p1", title: "Kordon" },
      savedAt: serverTimestamp(),
    }));
    await assertFails(getDocs(query(collection(ownerDb, "users/owner/savedPlaces"), limit(101))));
    await assertFails(deleteDoc(doc(otherDb, "users/owner/savedPlaces/p1")));
  });

  it("grup üyesi yalnız kendisini çıkarır; tanımsız koleksiyonlar varsayılan olarak kapalıdır", async () => {
    await seed("groups/group-1", {
      name: "Kapadokya ekibi",
      ownerUid: "owner",
      memberUids: ["owner", "member", "third"],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();

    // Başkasını çıkarmak veya yeni üye eklemek üye yetkisinin dışındadır.
    await assertFails(updateDoc(doc(memberDb, "groups/group-1"), {
      memberUids: ["owner", "member"],
      updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(memberDb, "groups/group-1"), {
      memberUids: ["owner", "member", "third", "invited"],
      updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(memberDb, "groups/group-1"), {
      memberUids: ["owner", "third"],
      updatedAt: serverTimestamp(),
    }));

    // match /{document=**} kapısı: tanımlanmamış her koleksiyon kapalıdır.
    await assertFails(getDoc(doc(memberDb, "admin/config")));
    await assertFails(setDoc(doc(memberDb, "admin/config"), { role: "admin" }));
    await assertFails(getDoc(doc(guestDb, "admin/config")));
    await assertFails(getDocs(query(collection(memberDb, "bilinmeyen"), limit(1))));
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

  // === C1 — Karşılıklı rıza: friendships create yalnız bekleyen friendRequest varken ===
  it("C1 arkadaslik istek olmadan kabul edilmiş arkadaşlık → FAIL; başkasının listesine kendini yazma → FAIL; meşru kabul → SUCCEED", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const charlieDb = testEnv.authenticatedContext("charlie").firestore();
    // Bekleyen istek yokken friendships create reddedilir
    const valid = {
      users: ["alice", "bob"],
      requesterUid: "alice",
      recipientUid: "bob",
      status: "accepted",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as const;
    await assertFails(setDoc(doc(bobDb, "friendships/alice_bob"), valid));
    // Bekleyen istek oluştur
    await seed("users/bob/friendRequests/alice", { fromUid: "alice", fromName: "Alice", toUid: "bob", createdAt: Timestamp.now() });
    // Gönderen kabul edemez (recipientUid != auth)
    await assertFails(setDoc(doc(aliceDb, "friendships/alice_bob"), valid));
    // Meşru kabul: alıcı batch ile friendships create + request delete (getAfter)
    const okBatch = writeBatch(bobDb);
    okBatch.set(doc(bobDb, "friendships/alice_bob"), valid);
    okBatch.delete(doc(bobDb, "users/bob/friendRequests/alice"));
    await assertSucceeds(okBatch.commit());
    await assertSucceeds(getDoc(doc(bobDb, "friendships/alice_bob")));
    await assertSucceeds(getDoc(doc(aliceDb, "friendships/alice_bob")));
    await assertFails(getDoc(doc(charlieDb, "friendships/alice_bob")));
    // Başkasının arkadaş listesine kendini ekleme → FAIL (C1)
    await seed("friendships/alice_bob", { users: ["alice", "bob"], requesterUid: "alice", recipientUid: "bob", status: "accepted", createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await assertFails(setDoc(doc(aliceDb, "users/bob/friends/alice"), { friendUid: "alice", friendName: "Alice", since: serverTimestamp() }));
    // Kendi listene valid friendship ile → SUCCEED
    await assertSucceeds(setDoc(doc(aliceDb, "users/alice/friends/bob"), { friendUid: "bob", friendName: "Bob", since: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(bobDb, "users/bob/friends/alice"), { friendUid: "alice", friendName: "Alice", since: serverTimestamp() }));
    // Yetkisiz okuma → FAIL
    await assertFails(getDoc(doc(bobDb, "users/alice/friends/bob")));
  });

  // === C2 — Katılma kodu en az 6 hane + deneme sınırı ve kilit ===
  it("C2 kod en az 6 hane olmalı; yeni grup kodlu oluşur, 4 hane reddedilir", async () => {
    const ownerDb = testEnv.authenticatedContext("owner").firestore();
    // 4 haneli kod ile oluşturma → FAIL
    await assertFails(
      setDoc(doc(ownerDb, "groups/short-code"), {
        name: "Kısa Kod",
        ownerUid: "owner",
        memberUids: ["owner"],
        joinCode: "1234",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    // 6 haneli kod ile oluşturma → SUCCEED
    await assertSucceeds(
      setDoc(doc(ownerDb, "groups/good-code"), {
        name: "İyi Kod",
        ownerUid: "owner",
        memberUids: ["owner"],
        joinCode: "123456",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    // 8 hane de geçerli
    await assertSucceeds(
      setDoc(doc(ownerDb, "groups/good-code-8"), {
        name: "8 Hane",
        ownerUid: "owner",
        memberUids: ["owner"],
        joinCode: "12345678",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  // C2/#37-düzeltme: okumasız katılma. İstemci gerçek yazım sırasını izler:
  // 1) kendi deneme belgesini ayrı commit eder (yanlış kodda da kalır),
  // 2) grubu yalnız memberUids arrayUnion ile günceller (grup okuması yok).
  it("C2 okumasız kod katılması: yanlış kod attempts artırır, doğru kod katılır; 6. deneme ve geri yazma reddedilir", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await seed("groups/group-code", {
      name: "KodGrubu",
      ownerUid: "alice",
      memberUids: ["alice"],
      joinCode: "123456",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const attemptRef = doc(bobDb, "groups/group-code/joinAttempts/bob");
    const groupRef = doc(bobDb, "groups/group-code");
    const join = () => updateDoc(groupRef, { memberUids: arrayUnion("bob"), updatedAt: serverTimestamp() });

    // Yanlış kod: deneme belgesi ayrı yazılır (SUCCEED), grup güncellemesi reddedilir (FAIL)
    await assertSucceeds(setDoc(attemptRef, { code: "999999", at: serverTimestamp(), attempts: 1, windowStart: serverTimestamp() }));
    await assertFails(join());
    // Sayaç geri yazılamaz: attempts 1'e düşürme (pencere açıkken) → FAIL
    await assertFails(setDoc(attemptRef, { code: "123456", at: serverTimestamp(), attempts: 1, windowStart: Timestamp.now() }));
    // Doğru kod: sayaç 2 olur (önceki windowStart korunur) → SUCCEED; katılım → SUCCEED
    const prev = (await getDoc(attemptRef)).data()!;
    await assertSucceeds(setDoc(attemptRef, { code: "123456", at: serverTimestamp(), attempts: 2, windowStart: prev.windowStart }));
    await assertSucceeds(join());
    const groupAfter = await getDoc(doc(aliceDb, "groups/group-code"));
    expect(groupAfter.data()!.memberUids).toContain("bob");
    // Kendi deneme kaydını silemez → FAIL; başkası bob'un denemesini yazamaz → FAIL
    await assertFails(deleteDoc(attemptRef));
    const charlieDb = testEnv.authenticatedContext("charlie").firestore();
    await assertFails(setDoc(doc(charlieDb, "groups/group-code/joinAttempts/bob"), { code: "123456", at: serverTimestamp(), attempts: 1, windowStart: serverTimestamp() }));
  });

  it("C2 pencere içinde 6. deneme FAIL; pencere dolunca sayaç 1'e döner ve doğru kod SUCCEED", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await seed("groups/group-lock", { name: "KilitGrubu", ownerUid: "alice", memberUids: ["alice"], joinCode: "654321", createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    const attemptRef = doc(bobDb, "groups/group-lock/joinAttempts/bob");
    const groupRef = doc(bobDb, "groups/group-lock");
    // Pencere açık, 5 deneme dolmuş → 6. deneme (attempts 6) reddedilir
    await seed("groups/group-lock/joinAttempts/bob", {
      code: "000000",
      at: Timestamp.now(),
      attempts: 5,
      windowStart: Timestamp.now(),
    });
    const prev = (await getDoc(attemptRef)).data()!;
    await assertFails(setDoc(attemptRef, { code: "654321", at: serverTimestamp(), attempts: 6, windowStart: prev.windowStart }));
    // Sayaç 5'te: bu pencerede yeni sayaç 1'e sıfırlanamaz (pencere açık) → FAIL
    await assertFails(setDoc(attemptRef, { code: "654321", at: serverTimestamp(), attempts: 1, windowStart: serverTimestamp() }));
    // Pencere dolmuş (16 dk önce başladı) → sayaç 1, doğru kod SUCCEED, katılım SUCCEED
    await seed("groups/group-lock/joinAttempts/bob", {
      code: "000000",
      at: Timestamp.now(),
      attempts: 5,
      windowStart: Timestamp.fromDate(new Date(Date.now() - 16 * 60 * 1000)),
    });
    await assertSucceeds(setDoc(attemptRef, { code: "654321", at: serverTimestamp(), attempts: 1, windowStart: serverTimestamp() }));
    await assertSucceeds(updateDoc(groupRef, { memberUids: arrayUnion("bob"), updatedAt: serverTimestamp() }));
  });

  it("C2 bayat deneme (2 dakikadan eski) ile katılım reddedilir; üye olmayan grup belgesini okuyamaz", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const charlieDb = testEnv.authenticatedContext("charlie").firestore();
    await seed("groups/group-stale", { name: "Bayat", ownerUid: "alice", memberUids: ["alice"], joinCode: "246810", createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await seed("groups/group-stale/joinAttempts/bob", {
      code: "246810",
      at: Timestamp.fromDate(new Date(Date.now() - 3 * 60 * 1000)),
      attempts: 1,
      windowStart: Timestamp.fromDate(new Date(Date.now() - 3 * 60 * 1000)),
    });
    await assertFails(updateDoc(doc(bobDb, "groups/group-stale"), { memberUids: arrayUnion("bob"), updatedAt: serverTimestamp() }));
    // Üye olmayan grup belgesini okuma → permission-denied (okumasız katılma bunu gerektirmez)
    await assertFails(getDoc(doc(charlieDb, "groups/group-stale")));
  });

  it("C2 deneme kaydı yalnız kendi uid'iyle, kod biçimi 6–8 hane ve bilinmeyen alan olmadan yazılır", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(setDoc(doc(bobDb, "groups/group-x/joinAttempts/bob"), { code: "1234", at: serverTimestamp(), attempts: 1, windowStart: serverTimestamp() }));
    await assertFails(setDoc(doc(bobDb, "groups/group-x/joinAttempts/bob"), { code: "123456", at: serverTimestamp(), attempts: 2, windowStart: serverTimestamp() }));
    await assertFails(setDoc(doc(bobDb, "groups/group-x/joinAttempts/bob"), { code: "123456", at: serverTimestamp(), attempts: 1, windowStart: serverTimestamp(), lockedUntil: Timestamp.now() }));
    await assertSucceeds(setDoc(doc(bobDb, "groups/group-x/joinAttempts/bob"), { code: "123456", at: serverTimestamp(), attempts: 1, windowStart: serverTimestamp() }));
  });

  // === Eski gruplarla uyum: joinCode isteğe bağlı ===
  it("Eski gruplarla uyum: kodsuz eski grup güncellenir; yeni grup kodlu oluşur; eski gruba kod eklenebilir", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    // Eski grup: joinCode yok
    await seed("groups/legacy-group", {
      name: "EskiGrup",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    // Üye son mesaj yazabilir (joinCode olmadan)
    await assertSucceeds(
      updateDoc(doc(bobDb, "groups/legacy-group"), {
        lastMessage: { text: "Selam", senderUid: "bob", senderName: "Bob", createdAt: serverTimestamp() },
        updatedAt: serverTimestamp(),
      }),
    );
    // Üye ayrılabilir
    await assertSucceeds(updateDoc(doc(bobDb, "groups/legacy-group"), { memberUids: ["alice"], updatedAt: serverTimestamp() }));
    await seed("groups/legacy-group", {
      name: "EskiGrup",
      ownerUid: "alice",
      memberUids: ["alice", "bob"],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    // Kurucu kodsuz eski gruba 6 haneli kod ekleyebilir → SUCCEED
    const legacySnap = await getDoc(doc(aliceDb, "groups/legacy-group"));
    const createdAt = legacySnap.data()!.createdAt;
    await assertSucceeds(
      updateDoc(doc(aliceDb, "groups/legacy-group"), {
        name: "EskiGrup",
        ownerUid: "alice",
        memberUids: ["alice", "bob"],
        joinCode: "112233",
        createdAt,
        updatedAt: serverTimestamp(),
      }),
    );
    // 4 haneli kod ekleme → FAIL
    await seed("groups/legacy-group2", { name: "Eski2", ownerUid: "alice", memberUids: ["alice"], createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    const snap2 = await getDoc(doc(aliceDb, "groups/legacy-group2"));
    await assertFails(
      updateDoc(doc(aliceDb, "groups/legacy-group2"), {
        name: "Eski2",
        ownerUid: "alice",
        memberUids: ["alice"],
        joinCode: "1234",
        createdAt: snap2.data()!.createdAt,
        updatedAt: serverTimestamp(),
      }),
    );
    // Tam kimlikle katılma (kodsuz eski grup) (#31 akışı) çalışır — üye olmayan davet olmadan eklenemez ama tam kimlikle joinGroup yolu var
    // Kodsuz grupta kod yolu çalışmaz, ancak davet yolu çalışır
    await seed("groups/group-invite-old", {
      name: "DavetEski",
      ownerUid: "alice",
      memberUids: ["alice"],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await seed("groups/group-invite-old/invites/bob", {
      invitedUid: "bob",
      inviterUid: "alice",
      groupId: "group-invite-old",
      groupName: "DavetEski",
      createdAt: Timestamp.now(),
    });
    const acceptBatch = writeBatch(bobDb);
    acceptBatch.update(doc(bobDb, "groups/group-invite-old"), { memberUids: ["alice", "bob"], updatedAt: serverTimestamp() });
    acceptBatch.delete(doc(bobDb, "groups/group-invite-old/invites/bob"));
    await assertSucceeds(acceptBatch.commit());
  });

  // === C4 — userProfiles sadece displayName ve photoURL ===
  it("C4 userProfiles displayName ve photoURL dışında alan okunmuyor/yazılmıyor", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    // displayName + photoURL ile oluşturma → SUCCEED
    await assertSucceeds(
      setDoc(doc(aliceDb, "userProfiles/alice"), {
        uid: "alice",
        displayName: "Alice",
        photoURL: "https://example.com/a.jpg",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    // Fazladan alan (email) → FAIL
    await assertFails(
      setDoc(doc(aliceDb, "userProfiles/alice2"), {
        uid: "alice2",
        displayName: "Alice2",
        email: "alice@example.com",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    // Başkasının profilini yazma → FAIL
    await assertFails(
      setDoc(doc(bobDb, "userProfiles/alice"), {
        uid: "alice",
        displayName: "Hacked",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    // Okuma: herkes oturumlu okuyabilir
    await assertSucceeds(getDoc(doc(bobDb, "userProfiles/alice")));
    // Liste 20 ile sınırlı → SUCCEED, 21 → FAIL
    await assertSucceeds(getDocs(query(collection(aliceDb, "userProfiles"), limit(20))));
    await assertFails(getDocs(query(collection(aliceDb, "userProfiles"), limit(21))));
  });
});
