import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface IndexField {
  fieldPath: string;
  order: "ASCENDING" | "DESCENDING";
}

interface FirestoreIndex {
  collectionGroup: string;
  queryScope: string;
  fields: IndexField[];
}

describe("Firestore sorgu yapılandırması", () => {
  it("firebase.json güvenlik kurallarıyla birlikte index dosyasını da işaret eder", () => {
    const config = JSON.parse(readFileSync("firebase.json", "utf8")) as {
      firestore?: { rules?: string; indexes?: string };
    };

    expect(config.firestore).toEqual({
      rules: "firestore.rules",
      indexes: "firestore.indexes.json",
    });
  });

  it("AUTH_SETUP canlı index yönergesini repodaki gerçek CLI yapılandırmasına bağlar", () => {
    const config = JSON.parse(readFileSync("firebase.json", "utf8")) as {
      firestore?: { indexes?: string };
    };
    const authSetup = readFileSync("AUTH_SETUP.md", "utf8");

    expect(authSetup).toContain("firebase deploy --only firestore:indexes --project <onayli-proje-id>");
    expect(authSetup).not.toContain("scripts/ensure-owner-places-index.mjs");
    expect(config.firestore?.indexes).toBe("firestore.indexes.json");
  });

  it("authorUid sahip ve lat/lng viewport sorgularının bileşik indekslerini tanımlar", () => {
    const config = JSON.parse(readFileSync("firestore.indexes.json", "utf8")) as {
      indexes: FirestoreIndex[];
      fieldOverrides: unknown[];
    };

    expect(config.indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        collectionGroup: "places",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "authorUid", order: "ASCENDING" },
          { fieldPath: "createdAt", order: "DESCENDING" },
        ],
      }),
      expect.objectContaining({
        collectionGroup: "places",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "lat", order: "ASCENDING" },
          { fieldPath: "lng", order: "ASCENDING" },
        ],
      }),
    ]));
    expect(config.fieldOverrides).toEqual([]);
  });
});
