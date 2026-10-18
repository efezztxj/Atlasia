/** Pin notu kelimeyle sınırlanır; Firestore'un 5.000 karakterlik üst sınırı da korunur. */
export const MAX_PLACE_NOTE_WORDS = 300;
export const MAX_PLACE_NOTE_CHARS = 5000;

/** Fotoğraflar pin dokümanında saklandığı için galeri bilinçli olarak küçük tutulur. */
export const MAX_PLACE_PHOTOS = 3;

export function countWords(text: string): number {
  return text.match(/\S+/gu)?.length ?? 0;
}

export interface PlacePhotoSelection {
  photos: string[];
  failures: { name: string; reason: string }[];
  skipped: number;
}

/** Mevcut fotoğrafları korur; seçilenleri sırayla hazırlar ve başarısızları atlamaz. */
export async function preparePlacePhotos(
  current: string[],
  files: readonly File[],
  upload: (file: File) => Promise<string>,
  explainError: (failure: unknown) => string,
): Promise<PlacePhotoSelection> {
  const photos = [...current];
  const failures: PlacePhotoSelection["failures"] = [];
  let skipped = 0;

  for (const [index, file] of files.entries()) {
    if (photos.length >= MAX_PLACE_PHOTOS || index >= MAX_PLACE_PHOTOS * 2) {
      skipped = files.length - index;
      break;
    }
    try {
      const prepared = await upload(file);
      if (photos.includes(prepared)) {
        failures.push({ name: file.name || "Fotoğraf", reason: "Bu fotoğraf zaten eklendi." });
        continue;
      }
      photos.push(prepared);
    } catch (failure) {
      failures.push({ name: file.name || "Fotoğraf", reason: explainError(failure) });
    }
  }

  return { photos, failures, skipped };
}
