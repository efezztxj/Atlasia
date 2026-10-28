export const MAX_CLOUD_PHOTO_CHARS = 180_000;

/**
 * M-23 / P0-4 (Spark $0 ücretsiz plan kararı): Firestore kural tavanı 180.000
 * karakter olarak korunurken yeni bulut yüklemeleri varsayılan olarak 100.000
 * karakter (~73 KB ikili JPEG) hedefine sıkıştırılır. Böylece 10 fotoğraflı bir
 * akış sayfası < 800 KB kalır ve Spark aylık 10 GiB bant genişliği korunur.
 */
export const DEFAULT_CLOUD_PHOTO_BUDGET_CHARS = 100_000;

/**
 * T10 — girdi kapıları. 48 MP telefon fotoğrafı ~15 MB; 25 MB üstü dosyalar
 * mobilde decode sırasında sekmeyi düşürebiliyor (OOM). Sınır **decode
 * edilmeden** uygulanır, böylece bellek hiç ayrılmaz.
 */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/** iPhone varsayılanı; tarayıcıların çoğu HEIC'i çözemez. */
const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const HEIC_EXT = /\.(heic|heif)$/i;

/**
 * Kullanıcıya doğrudan gösterilebilecek güvenli Türkçe görsel doğrulama hatası.
 * Bileşenlerdeki `catch` blokları beklenmeyen teknik hataları sızdırmadan bu
 * mesajları koruyabilsin diye `photoUploadErrorMessage` ile eşlenir (M-44/T10).
 */
export class ImageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageInputError";
  }
}

export function photoUploadErrorMessage(failure: unknown, fallback: string): string {
  return failure instanceof ImageInputError ? failure.message : fallback;
}

/**
 * Bulut kaydı için kademeli küçültme planı. Dışa açık: sıralamanın
 * tek yönlü (hep küçülen) kaldığını test kilitliyor.
 */
export const CLOUD_PHOTO_ATTEMPTS = Object.freeze([
  { maxSide: 820, quality: 0.68 },
  { maxSide: 720, quality: 0.62 },
  { maxSide: 620, quality: 0.56 },
  { maxSide: 520, quality: 0.5 },
  { maxSide: 440, quality: 0.44 },
  { maxSide: 360, quality: 0.38 },
]);

/** Ortak girdi doğrulaması: tür, boyut ve HEIC yönlendirmesi. */
function assertUsableImage(file: File): void {
  const mime = file.type.toLowerCase();
  if (HEIC_TYPES.has(mime) || HEIC_EXT.test(file.name)) {
    throw new ImageInputError(
      "iPhone HEIC fotoğrafı tarayıcıda açılamıyor. Ayarlar → Kamera → Biçimler → \"En Uyumlu\" seç ya da fotoğrafı JPEG olarak yükle.",
    );
  }
  if (!mime.startsWith("image/")) throw new ImageInputError("Bu bir görsel değil");
  if (file.size > MAX_INPUT_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1).replace(".", ",");
    throw new ImageInputError(`Fotoğraf çok büyük (${mb} MB). Üst sınır 25 MB; daha küçük bir fotoğraf seç.`);
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
  if (!ctx) throw new ImageInputError("Görsel işlenemedi");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  if (!dataUrl.startsWith("data:image/jpeg;base64,")) {
    throw new ImageInputError("Görsel JPEG biçimine dönüştürülemedi");
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
  maxDataUrlChars = DEFAULT_CLOUD_PHOTO_BUDGET_CHARS,
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

  throw new ImageInputError("Fotoğraf güvenli kayıt boyutuna küçültülemedi");
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
      reject(new ImageInputError("Görsel okunamadı"));
    };
    img.src = url;
  });
}

/** Yerel modda localStorage'ı şişirmemek için daha sıkı sıkıştırma */
export const compressForLocal = (file: File) => compressImage(file, 900, 0.68);
