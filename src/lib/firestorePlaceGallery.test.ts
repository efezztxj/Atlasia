import { beforeEach, describe, expect, it, vi } from "vitest";

const setDocMock = vi.hoisted(() => vi.fn<(ref: unknown, data: Record<string, unknown>) => Promise<void>>(async () => {}));
vi.mock("./firebase", () => ({ db: {}, firebaseConfigured: true }));
vi.mock("firebase/firestore", async (importOriginal) => ({
  ...await importOriginal<typeof import("firebase/firestore")>(),
  doc: () => ({ path: "places/new" }),
  serverTimestamp: () => "server-time",
  setDoc: setDocMock,
}));

import { addPlace } from "./firestoreData";

const input = {
  uid: "owner",
  title: "Yeni pin",
  region: "İzmir",
  category: "nature" as const,
  lng: 27,
  lat: 38,
  note: "300 kelimeye kadar not",
  author: "Gezgin",
  photoUrl: "data:image/jpeg;base64,AQ==",
};

beforeEach(() => setDocMock.mockClear());

describe("Firestore pin galerisi yazımı", () => {
  it("kapak ve diğer fotoğrafları aynı pin dokümanında atomik kaydeder", async () => {
    const gallery = ["data:image/jpeg;base64,Ag==", "data:image/jpeg;base64,Aw=="];
    const created = await addPlace({ ...input, gallery });
    expect(setDocMock).toHaveBeenCalledOnce();
    expect(setDocMock.mock.calls[0]?.[1]).toMatchObject({
      photo: input.photoUrl,
      gallery,
      authorUid: "owner",
      note: input.note,
    });
    expect(created.photo).toBe(input.photoUrl);
    expect(created.gallery).toEqual(gallery);
  });

  it("eski tek fotoğraflı pinlere boş galeri alanı eklemez", async () => {
    const created = await addPlace(input);
    expect(setDocMock.mock.calls[0]?.[1]).not.toHaveProperty("gallery");
    expect(created.gallery).toBeUndefined();
  });
});
