/**
 * Sesli tur çeviri kayıtları.
 *
 * KURAL: Çevirisi olan her tur burada **bir satırla** bildirilir. Dosya adı
 * turun `placeId`'sinden türetilmez, açıkça yazılır: böylece olmayan bir
 * çeviri dosyasına istek atılmaz ve çevirisi olmayan turda dil düğmesi
 * gösterilmez.
 *
 * Yeni dil eklemek: dosyayı `public/audio/` altına koy, buraya satır ekle,
 * `docs/icerik/sesli-anlatim-rehberi/README.md` içindeki adımı izle.
 */
export interface EnglishAudioStop {
  title: string;
  description: string;
  imageAlt: string;
  audio?: string;
}

/** `placeId` → İngilizce anlatım dosyası. Kayıt yoksa dil düğmesi gizlenir. */
export const ENGLISH_AUDIO_SOURCES: Readonly<Record<string, string>> = Object.freeze({
  efes: "/audio/efes-en.json",
});
