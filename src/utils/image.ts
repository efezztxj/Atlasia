export const MAX_CLOUD_PHOTO_CHARS = 180_000;
/** Pinler Firestore dokümanında saklanır: üç fotoğrafın toplamını küçük tut. */
export const MAX_PLACE_PHOTO_CHARS = 100_000;
const MAX_INPUT_IMAGE_BYTES = 30 * 1024 * 1024;

type PhotoErrorCode = "photo/type" | "photo/empty" | "photo/large" | "photo/decode" | "photo/heic" | "photo/canvas" | "photo/limit";

export class PhotoProcessingError extends Error {
  constructor(public readonly code: PhotoErrorCode) {
    super(code);
    this.name = "PhotoProcessingError";
  }
}

/** Teknik hata yerine kullanıcıya denenebilir bir sonraki adım söyler. */
export function photoUploadErrorMessage(failure: unknown): string {
  if (failure instanceof PhotoProcessingError) {
    switch (failure.code) {
      case "photo/type": return "Bu dosya bir fotoğraf değil. JPG, PNG, WebP veya HEIC seç.";
      case "photo/empty": return "Dosya boş. Galeriden başka bir fotoğraf seç.";
      case "photo/large": return "Dosya 30 MB üstünde. Daha küçük bir fotoğraf seç.";
      case "photo/heic": return "HEIC fotoğrafı bu tarayıcıda dönüştürülemedi. Galeriden JPG olarak paylaşmayı dene.";
      case "photo/limit": return "Fotoğraf kayıt boyutuna sığmadı. Daha küçük bir fotoğraf seç.";
      case "photo/canvas": return "Tarayıcı fotoğrafı işleyemedi. JPG olarak kaydedip tekrar dene.";
      case "photo/decode": return "Fotoğraf açılamadı. JPG, PNG veya WebP olarak tekrar seç.";
    }
  }
  if ((failure as Error | null)?.message?.includes("Bulut bağlantısı yok")) {
    return "Bulut bağlantısı yok. İnternetini kontrol edip tekrar dene.";
  }
  return "Fotoğraf hazırlanamadı. Başka bir fotoğrafla tekrar dene.";
}

interface CompressedImage {
  dataUrl: string;
  width: number;
  height: number;
}

function renderCompressed(
  bitmap: ImageBitmap | HTMLImageElement,
  maxSide: number,
  quality: number,
): CompressedImage {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoProcessingError("photo/canvas");
  try {
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (!dataUrl.startsWith("data:image/jpeg;base64,")) throw new PhotoProcessingError("photo/canvas");
    return { dataUrl, width, height };
  } catch {
    throw new PhotoProcessingError("photo/canvas");
  }
}

function closeBitmap(bitmap: ImageBitmap | HTMLImageElement) {
  if ("close" in bitmap) (bitmap as ImageBitmap).close();
}

/** Android dosya sağlayıcıları bazen type alanını boş ya da octet-stream döndürür. */
function validateFile(file: File) {
  if (file.size === 0) throw new PhotoProcessingError("photo/empty");
  if (file.size > MAX_INPUT_IMAGE_BYTES) throw new PhotoProcessingError("photo/large");
  if (file.type && !file.type.startsWith("image/") && file.type !== "application/octet-stream"
      && !/\.(?:jpe?g|png|webp|avif|heic|heif)$/iu.test(file.name)) {
    throw new PhotoProcessingError("photo/type");
  }
}

/** HEIC/HEIF uzantısı gizli olsa bile ftyp imzasını tanır; AVIF'i HEIC sanmaz. */
export async function isHeicFile(file: File): Promise<boolean> {
  if (/^image\/hei[cf](?:-sequence)?$/iu.test(file.type) || /\.hei[cf]$/iu.test(file.name)) return true;
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (header.length < 12) return false;
  const ascii = (start: number, end: number) => String.fromCharCode(...header.slice(start, end));
  return ascii(4, 8) === "ftyp" && ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(ascii(8, 12));
}

async function decodeBlob(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Bazı mobil tarayıcılarda Image elementi çözebilir; yedek yol.
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new PhotoProcessingError("photo/decode"));
    };
    img.src = url;
  });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  validateFile(file);
  try {
    return await decodeBlob(file);
  } catch {
    if (!(await isHeicFile(file))) throw new PhotoProcessingError("photo/decode");
  }

  // Yalnız tarayıcının açamadığı HEIC dosyalarında yüklenir; normal JPG akışı
  // yeni bir indirme yapmaz. İşleme cihazda kalır, EXIF verisi JPEG'e taşınmaz.
  try {
    const { heicTo } = await import("heic-to/csp");
    const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.8 });
    return await decodeBlob(jpeg);
  } catch {
    throw new PhotoProcessingError("photo/heic");
  }
}

/** Seçilen fotoğrafı tarayıcıda küçültüp JPEG data URL'ine çevirir. */
export async function compressImage(
  file: File,
  maxSide = 1400,
  quality = 0.82,
): Promise<CompressedImage> {
  const bitmap = await loadBitmap(file);
  try {
    return renderCompressed(bitmap, maxSide, quality);
  } finally {
    closeBitmap(bitmap);
  }
}

/**
 * Bulut kayıtlarında Firestore doküman sınırını ve ücretsiz kotayı koruyacak
 * kadar küçük bir JPEG üretir. Fotoğraf tek kez çözülür; gerekirse kalite ve
 * boyut kademeli olarak azaltılır.
 */
export async function compressImageWithinLimit(
  file: File,
  maxDataUrlChars = MAX_CLOUD_PHOTO_CHARS,
): Promise<CompressedImage> {
  const bitmap = await loadBitmap(file);
  const attempts = [
    { maxSide: 860, quality: 0.7 },
    { maxSide: 760, quality: 0.64 },
    { maxSide: 660, quality: 0.58 },
    { maxSide: 560, quality: 0.52 },
    { maxSide: 480, quality: 0.46 },
    { maxSide: 400, quality: 0.4 },
    { maxSide: 320, quality: 0.36 },
  ];

  try {
    for (const attempt of attempts) {
      const result = renderCompressed(bitmap, attempt.maxSide, attempt.quality);
      if (result.dataUrl.length <= maxDataUrlChars) return result;
    }
  } finally {
    closeBitmap(bitmap);
  }

  throw new PhotoProcessingError("photo/limit");
}

/** Yerel modda localStorage'ı şişirmemek için daha sıkı sıkıştırma */
export const compressForLocal = (file: File) => compressImage(file, 900, 0.68);
