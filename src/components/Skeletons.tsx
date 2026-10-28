/**
 * Atlasia — yükleme iskeletleri (denetim M-19).
 *
 * NEDEN VAR: İskelet yalnız `RecordsDock`'ta vardı. Feed, arama sonuçları ve yer
 * detayında yükleme sırasında ekran ya boş görünüyor ya tek satır metin
 * gösteriyordu; ikisi de "uygulama bozuk" algısı üretiyor. İskelet, gelecek
 * içeriğin yerini tutar: düzen kaymaz (CLS), durum da görünür kalır.
 *
 * KURAL: Shimmer katmanı `aria-hidden`'dır; ekran okuyucuya yalnız `role="status"`
 * üzerinden tek bir anlamlı cümle gider (yüzlerce yapay kutu okunmaz).
 */

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-xl ${className}`} />;
}

const repeat = (count: number) => Array.from({ length: count }, (_, index) => index);

function StatusText({ children }: { children: string }) {
  return <p className="sr-only">{children}</p>;
}

/** Feed: gönderi kartı yer tutucusu (avatar + başlık + 2 satır + görsel). */
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" data-skeleton="feed">
      <StatusText>Gönderiler yükleniyor…</StatusText>
      {repeat(count).map((index) => (
        <div key={index} className="mb-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2.5">
            <SkeletonBlock className="size-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-2.5 w-24" />
              <SkeletonBlock className="mt-1.5 h-2 w-16" />
            </div>
          </div>
          <SkeletonBlock className="mt-2.5 h-2.5 w-full rounded-full" />
          <SkeletonBlock className="mt-1.5 h-2.5 w-4/5 rounded-full" />
          <SkeletonBlock className="mt-2.5 h-24 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Arama: sonuç satırı yer tutucusu (ikon + başlık + alt satır). */
export function SearchListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" data-skeleton="search" className="px-1">
      <StatusText>Arama sonuçları yükleniyor…</StatusText>
      {repeat(count).map((index) => (
        <div key={index} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <SkeletonBlock className="size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-2.5 w-2/3" />
            <SkeletonBlock className="mt-1.5 h-2 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Yer detayı: fotoğraf yer tutucusu. */
export function GallerySkeleton() {
  return (
    <div role="status" data-skeleton="gallery">
      <StatusText>Fotoğraflar yükleniyor…</StatusText>
      <SkeletonBlock className="h-40 w-full" />
    </div>
  );
}
