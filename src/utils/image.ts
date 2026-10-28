export const MAX_CLOUD_PHOTO_CHARS = 180_000;

/**
 * T10 — girdi kapıları. 48 MP telefon fotoğrafı ~15 MB; 25 MB üstü dosyalar
 * mobilde decode sırasında sekmeyi düşürebiliyor (OOM). Sınır **decode
 * edilmeden** uygulanır, böylece bellek hiç ayrılmaz.
 */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/** iPhone varsayılanı; tarayıcıların çoğu HEIC'i çözemez. */
const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

/**
 * Bulut kaydı için kademeli küçültme planı. Dışa açık: sıralamanın
 * tek yönlü (hep küçülen) kaldığını test kilitliyor.
 */
export const CLOUD_PHOTO_ATTEMPTS = Object.freeze([
  { maxSide: 860, quality: 0.7 },
  { maxSide: 760, quality: 0.64 },
  { maxSide: 660, quality: 0.58 },
  { maxSide: 560, quality: 0.52 },
  { maxSide: 480, quality: 0.46 },
  { maxSide: 400, quality: 0.4 },
]);

/** Ortak girdi doğrulaması: tür, boyut ve HEIC yönlendirmesi. */
function assertUsableImage(file: File): void {
  if (!file.type.startsWith("image/")) throw new Error("Bu bir görsel değil");
  if (HEIC_TYPES.has(file.type)) {
    throw new Error(
      "iPhone HEIC fotoğrafı tarayıcıda açılamıyor. Ayarlar → Kamera → Biçimler → \"En Uyumlu\" seç ya da fotoğrafı JPEG olarak yükle.",
    );
  }
  if (file.size > MAX_INPUT_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1).replace(".", ",");
    throw new Error(`Fotoğraf çok büyük (${mb} MB). Üst sınır 25 MB; daha küçük bir fotoğraf seç.`);
  }
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
  if (!ctx) throw new Error("Görsel işlenemedi");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  if (!dataUrl.startsWith("data:image/jpeg;base64,")) {
    throw new Error("Görsel JPEG biçimine dönüştürülemedi");
  }
  return { dataUrl, width, height };
}

function closeBitmap(bitmap: ImageBitmap | HTMLImageElement) {
  if ("close" in bitmap) (bitmap as ImageBitmap).close();
}

/** Seçilen fotoğrafı tarayıcıda küçültüp JPEG data URL'ine çevirir. */
export async function compressImage(
  file: File,
  maxSide = 1400,
  quality = 0.82,
): Promise<CompressedImage> {
  assertUsableImage(file);

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
  assertUsableImage(file);

  const bitmap = await loadBitmap(file);

  try {
    for (const attempt of CLOUD_PHOTO_ATTEMPTS) {
      const result = renderCompressed(bitmap, attempt.maxSide, attempt.quality);
      if (result.dataUrl.length <= maxDataUrlChars) return result;
    }
  } finally {
    closeBitmap(bitmap);
  }

  throw new Error("Fotoğraf güvenli kayıt boyutuna küçültülemedi");
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // T10: yön bilgisi **açıkça** istenir. Varsayılana güvenilirse eski
      // tarayıcılarda telefon fotoğrafı yan yatmış kaydediliyordu.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* yedek yola geç */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel okunamadı"));
    };
    img.src = url;
  });
}

/** Yerel modda localStorage'ı şişirmemek için daha sıkı sıkıştırma */
export const compressForLocal = (file: File) => compressImage(file, 900, 0.68);
