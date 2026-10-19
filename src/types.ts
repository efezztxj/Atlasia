export type CategoryId =
  | "cities"
  | "beaches"
  | "history"
  | "nature"
  | "camp"
  | "food"
  | "photo"
  | "routes"
  | "community"
  | "issues";

export interface Place {
  id: string;
  title: string;
  region: string;
  category: CategoryId;
  lng: number;
  lat: number;
  note: string;
  image?: string;
  /** Kullanıcı keşiflerine eklenen fotoğraf */
  photo?: string;
  /** 5–10 gerçek fotoğraf */
  gallery?: string[];
  /** Yerin özgün hikâyesi */
  story?: string;
  author: string;
  /** Kullanıcı üretimi bir izin Firebase hesap sahibi. Rehber yerlerinde bulunmaz. */
  authorUid?: string;
  kind: "guide" | "user";
  createdAt?: number;
}

export interface ViewState {
  zoom: number;
  lng: number;
  lat: number;
}

/** Akıştaki bir gönderiye verilen yanıt */
export interface FeedReply {
  id: string;
  author: string;
  /** Bulut yanıtlarında Firebase hesap sahibi. */
  authorUid?: string;
  text: string;
  createdAt: number;
  likes: number;
  liked?: boolean;
  kind: "seed" | "user";
}

/** Threads benzeri akış gönderisi */
export interface FeedPost {
  id: string;
  author: string;
  /** Kullanıcı gönderilerinde Firebase hesap sahibi. */
  authorUid?: string;
  text: string;
  createdAt: number;
  /** Şema uyumluluğu için sabit başlangıç sayısı; kullanıcı gönderileri 0 ile başlar. */
  likes: number;
  /** Beğenen istemcilerin kimlikleri */
  likedBy?: string[];
  /** Gönderi bir noktaya bağlıysa */
  placeLabel?: string;
  lng?: number;
  lat?: number;
  /** Sunucudaki yol (/media/...) ya da yerel data URL */
  photo?: string;
  replies: FeedReply[];
  kind: "seed" | "user";
}

export type StoryAccent = "sun" | "leaf" | "sea" | "dusk";
export type UploadPhotoKind = "place" | "post" | "story";

/** 24 saat yaşayan kısa keşif notu */
export interface Story {
  id: string;
  author: string;
  /** Kullanıcı story'sinde Firebase hesap sahibi. */
  authorUid?: string;
  text: string;
  accent: StoryAccent;
  createdAt: number;
  placeLabel?: string;
  lng?: number;
  lat?: number;
  /** Sunucudaki yol (/media/...) ya da yerel data URL */
  photo?: string;
  seen?: boolean;
  kind: "seed" | "user";
}

export type TransportMode = "walking" | "cycling" | "driving" | "transit";
export type RouteTempo = "Rahat" | "Dengeli" | "Yoğun";
export type RouteBudget = "Düşük" | "Orta" | "Yüksek";
export type StopType =
  | "city"
  | "nature"
  | "history"
  | "food"
  | "photo"
  | "camp"
  | "beach"
  | "viewpoint"
  | "hidden_gem"
  | "other";

export interface RouteStop {
  order: number;
  name: string;
  type: StopType;
  lat: number;
  lng: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  description: string;
  aiReason: string;
  tips: string[];
  isCommunityPin: boolean;
  pinId: string | null;
  category: string;
  imageUrl: string | null;
  source?: "atlasia" | "community" | "openstreetmap";
}

export interface RouteDay {
  dayNumber: number;
  title: string;
  summary: string;
  stops: RouteStop[];
  polyline: string;
}

export type RouteVisibility = "private" | "unlisted" | "public";

export interface AtlasTrackStop {
  startedAt: number;
  endedAt: number;
  lat: number;
  lng: number;
  pointCount: number;
}

/** Sahibe özel ham iz: zaman bilgisi tam çözünürlüklü noktalarla kayıtta türetilir. */
export interface AtlasTrack {
  id: string;
  authorUid: string;
  startedAt: number;
  endedAt: number;
  distanceKm: number;
  polyline: string;
  stops: AtlasTrackStop[];
  accuracy: { sampleCount: number; meanMeters: number; maxMeters: number };
  createdAt?: number;
}

export interface AtlasRoute {
  id: string;
  routeTitle: string;
  routeSummary: string;
  totalDurationHours: number;
  totalDistanceKm: number;
  transport: TransportMode;
  vibe: string;
  days: RouteDay[];
  weatherNote: string | null;
  alternatives: { label: string; prompt: string }[];
  dataSources?: string[];
  createdAt: number;
  origin?: { lat: number; lng: number };
}

export interface RouteBrief {
  duration: "half" | "day" | "multi" | "custom";
  customHours?: number;
  tempo: RouteTempo;
  interests: string[];
  transport: TransportMode;
  budget: RouteBudget;
  vibe: string;
  start: "me" | "map" | "pick";
  rain: "auto" | "flex";
}
