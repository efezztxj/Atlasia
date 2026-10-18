import { describe, expect, it } from "vitest";
import type { Place } from "../types";
import { getPlacePhotos } from "./placePhotos";

const place: Place = {
  id: "yeni-pin", title: "Yeni pin", category: "nature", region: "İzmir",
  lng: 27, lat: 38, note: "Not", author: "Gezgin", kind: "user",
};

describe("pin fotoğraf galerisi", () => {
  it("eski tek fotoğraflı pinleri ve yeni üç fotoğraflı pinleri sırayla gösterir", () => {
    expect(getPlacePhotos({ ...place, photo: "data:image/jpeg;base64,AQ==" })).toEqual(["data:image/jpeg;base64,AQ=="]);
    expect(getPlacePhotos({ ...place, photo: "cover", gallery: ["second", "third"] })).toEqual(["cover", "second", "third"]);
  });

  it("aynı fotoğrafı tekrar göstermez", () => {
    expect(getPlacePhotos({ ...place, photo: "same", gallery: ["same", "other"] })).toEqual(["same", "other"]);
  });
});
