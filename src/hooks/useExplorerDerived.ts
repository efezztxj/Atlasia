/**
 * Atlasia — Explorer'ın türetilmiş değerleri (F1-6, adım 5).
 *
 * NEDEN VAR: `Explorer.tsx` içinde ham veriden türeyen 13 değer (görünür yerler,
 * sahiplik, açık yer, "şu an" seçili yer, yakınlık sayacı, engellenmiş yazar
 * filtresi, okunmamış sayacı) art arda `useMemo`/`useCallback` blokları olarak
 * duruyordu. Hepsi **saf türetme**: hiçbiri yan etki kurmaz, hiçbiri durum
 * sahibi değildir.
 *
 * SÖZLEŞME: Girdi kümeleri adlarıyla birebir aynıdır; `Explorer` bu değerleri
 * olduğu gibi alt bileşenlere geçirir. Davranış testi
 * `useExplorerDerived.test.ts` içinde (yakınlık eşiği, silme yetkisi, filtre).
 */
import { useCallback, useMemo } from "react";
import { GUIDE_PLACES } from "../data/places";
import { haversineKm } from "../utils/geo";
import type { AppNotification } from "../lib/notifications";
import type { CategoryId, FeedPost, Place, Story, ViewState } from "../types";
import type { FreshnessController } from "./useFreshness";

export interface ExplorerDerivedDeps {
  /** Engellenmiş yazarlar çıkarılmış yerler. */
  discoveries: Place[];
  freshness: Pick<FreshnessController, "withFreshness">;
  uid: string | undefined;
  /** İlk canlı snapshot geldi mi? Sahiplik kapısında kullanılır. */
  remoteReady: boolean;
  category: CategoryId | null;
  featuredIdx: number;
  activeId: string | null;
  storyPlace: Place | null;
  view: ViewState;
  rawPosts: FeedPost[];
  rawStories: Story[];
  notifications: AppNotification[];
  isBlocked: (uid: string | undefined) => boolean;
}

export interface ExplorerDerived {
  allPlaces: Place[];
  canManagePlace: (place: Place) => boolean;
  myPlaces: Place[];
  visiblePlaces: Place[];
  activePlace: Place | undefined;
  liveStoryPlace: Place | null;
  current: Place | undefined;
  nearby: number;
  heroHidden: boolean;
  filteredPosts: FeedPost[];
  filteredStories: Story[];
  visibleNotifications: AppNotification[];
  unreadCount: number;
}

export function useExplorerDerived({
  discoveries, freshness, uid, remoteReady, category, featuredIdx, activeId, storyPlace,
  view, rawPosts, rawStories, notifications, isBlocked,
}: ExplorerDerivedDeps): ExplorerDerived {
  const allPlaces = useMemo(
    () => freshness.withFreshness([...discoveries, ...GUIDE_PLACES]),
    [discoveries, freshness],
  );

  // Sahiplik: yer kullanıcıya ait olmalı. `authorUid` yoksa yalnız ilk canlı
  // snapshot öncesi (yerel kayıt) sahiplik kabul edilir — sunucudan gelen
  // yazarsız yer silinemez.
  const canManagePlace = useCallback(
    (place: Place) => Boolean(uid) && place.kind === "user" && (place.authorUid ? place.authorUid === uid : !remoteReady),
    [remoteReady, uid],
  );

  const myPlaces = useMemo(() => discoveries.filter(canManagePlace), [discoveries, canManagePlace]);
  const visiblePlaces = useMemo(
    () => (category ? allPlaces.filter((p) => p.category === category) : allPlaces),
    [allPlaces, category],
  );

  const activePlace = activeId ? allPlaces.find((p) => p.id === activeId) : undefined;
  // Tazelik verisi canlı değiştiğinde açık detay paneli de güncel özeti gösterir.
  const liveStoryPlace = storyPlace
    ? allPlaces.find((item) => item.id === storyPlace.id) ?? storyPlace
    : null;
  const current =
    activePlace ??
    (visiblePlaces.length ? visiblePlaces[featuredIdx % visiblePlaces.length] : undefined);

  const nearby = useMemo(() => {
    if (view.zoom < 3.2) return discoveries.length;
    const km =
      ((window.innerWidth / 1024) * 40075 * Math.max(Math.cos((view.lat * Math.PI) / 180), 0.2)) /
      2 ** view.zoom;
    return discoveries.filter((d) => haversineKm(view.lat, view.lng, d.lat, d.lng) <= km).length;
  }, [discoveries, view]);

  const heroHidden = view.zoom > 3.4;

  const filteredPosts = useMemo(() => rawPosts.filter((po) => !isBlocked(po.authorUid)), [rawPosts, isBlocked]);
  const filteredStories = useMemo(() => rawStories.filter((st) => !isBlocked(st.authorUid)), [rawStories, isBlocked]);
  const visibleNotifications = useMemo(
    () => notifications.filter((item) => !isBlocked(item.actorUid)),
    [notifications, isBlocked],
  );
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  return {
    allPlaces, canManagePlace, myPlaces, visiblePlaces, activePlace, liveStoryPlace, current,
    nearby, heroHidden, filteredPosts, filteredStories, visibleNotifications, unreadCount,
  };
}
