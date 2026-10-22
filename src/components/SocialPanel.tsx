import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  CornerDownRight,
  Crosshair,
  Flag,
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Minus,
  MoreHorizontal,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

import { formatAccuracy } from "../hooks/useGeolocation";
import { totalLikes } from "../utils/likes";
import type { FeedPost, FeedReply, Story, StoryAccent, UploadPhotoKind, ViewState } from "../types";
import { mediaUrl } from "../utils/api";
import { cn } from "../utils/cn";
import { haversineKm } from "../utils/geo";
import { isStoryAlive, relativeTime } from "../utils/time";
import { storageGet, storageSet } from "../utils/storage";
import Avatar from "./Avatar";
import StoryComposer from "./StoryComposer";
import StoryViewer from "./StoryViewer";
import ReportDialog from "./ReportDialog";
import GroupsPanel from "./GroupsPanel";
import { blockUser } from "../lib/moderation";
import { friendlyDataError } from "../lib/firestoreValue";

const SEEN_KEY = "atlasia.feed.seen.v1";
const NEARBY_KM = 900;

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  view: ViewState;
  locationLabel: string;
  onGoTo: (lng: number, lat: number, label: string) => void;
  precise: { label: string; lng: number; lat: number; accuracy: number } | null;
  onRequestPrecise: () => void;

  /* Paylaşımlı veri */
  posts: FeedPost[];
  stories: Story[];
  hasMorePosts: boolean;
  hasMoreStories: boolean;
  loadingMorePosts: boolean;
  loadingMoreStories: boolean;
  onLoadMorePosts: () => Promise<void>;
  onLoadMoreStories: () => Promise<void>;
  clientId: string;
  currentUid: string;
  uploadPhoto: (file: File, kind: UploadPhotoKind) => Promise<string>;
  onAddPost: (p: Partial<FeedPost>) => Promise<unknown> | unknown;
  onRemovePost: (id: string) => Promise<unknown> | unknown;
  onAddReply: (postId: string, author: string, text: string) => Promise<unknown> | unknown;
  onLoadReplies: (postId: string) => Promise<FeedReply[]>;
  onToggleLike: (postId: string) => Promise<unknown> | unknown;
  onAddStory: (s: Partial<Story>) => Promise<unknown> | unknown;
  onRemoveStory: (id: string) => Promise<unknown> | unknown;
  blockedSet: Set<string>;
  isBlocked: (uid?: string | null) => boolean;
  pendingGroupId?: string | null;
  onGroupOpened?: () => void;
}

export default function SocialPanel({
  open,
  onOpen,
  onClose,
  view,
  locationLabel,
  onGoTo,
  precise,
  onRequestPrecise,
  posts,
  stories: allStories,
  hasMorePosts,
  hasMoreStories,
  loadingMorePosts,
  loadingMoreStories,
  onLoadMorePosts,
  onLoadMoreStories,
  clientId,
  currentUid,
  uploadPhoto,
  onAddPost,
  onRemovePost,
  onAddReply,
  onLoadReplies,
  onToggleLike,
  onAddStory,
  onRemoveStory,
  blockedSet,
  isBlocked,
  pendingGroupId,
  onGroupOpened,
}: Props) {
  const [seen, setSeen] = useState<string[]>(() => {
    try {
      return JSON.parse(storageGet(SEEN_KEY) ?? "[]") as string[];
    } catch {
      return [];
    }
  });

  const [tab, setTab] = useState<"all" | "near">("all");
  const [draft, setDraft] = useState("");
  const [attachPlace, setAttachPlace] = useState(true);
  const [usePrecise, setUsePrecise] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [repliesByPost, setRepliesByPost] = useState<Record<string, FeedReply[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<string[]>([]);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [reportPost, setReportPost] = useState<FeedPost | null>(null);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);
  useEffect(() => {
    if (!pendingGroupId) return;
    setGroupsOpen(true);
    onGroupOpened?.();
  }, [pendingGroupId, onGroupOpened]);

  const listRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storageSet(SEEN_KEY, JSON.stringify(seen.slice(-200)));
  }, [seen]);

  const author = () => storageGet("atlasia.author")?.trim() || "Gezgin";

  const placeForPost = useMemo(() => {
    if (usePrecise && precise) {
      return {
        label: `${precise.label} · ${formatAccuracy(precise.accuracy)}`,
        lng: precise.lng,
        lat: precise.lat,
      };
    }
    return {
      label: locationLabel === "Dünya" ? "Haritadaki konum" : locationLabel,
      lng: view.lng,
      lat: view.lat,
    };
  }, [usePrecise, precise, locationLabel, view.lng, view.lat]);

  const stories = useMemo(
    () =>
      [...allStories]
        .filter((s) => isStoryAlive(s.createdAt))
        .sort((a, b) => b.createdAt - a.createdAt),
    [allStories],
  );

  const visiblePosts = useMemo(() => {
    const sorted = [...posts].sort((a, b) => b.createdAt - a.createdAt);
    if (tab === "all") return sorted;
    const center = precise ?? { lat: view.lat, lng: view.lng };
    return sorted.filter(
      (p) =>
        p.lat !== undefined &&
        p.lng !== undefined &&
        haversineKm(center.lat, center.lng, p.lat, p.lng) <= NEARBY_KM,
    );
  }, [posts, tab, view.lat, view.lng, precise]);

  const unseenCount = stories.filter((s) => !seen.includes(s.id)).length;

  const runCloudAction = async (action: () => Promise<unknown> | unknown, message: string) => {
    setActionError(null);
    try {
      await action();
      return true;
    } catch (failure) {
      console.error("[Atlasia] Topluluk işlemi tamamlanamadı:", failure);
      setActionError(message);
      return false;
    }
  };

  const loadRepliesForPost = async (postId: string) => {
    if (loadingReplies.includes(postId)) return;
    setLoadingReplies((current) => [...current, postId]);
    try {
      const fetched = await onLoadReplies(postId);
      const legacy = posts.find((post) => post.id === postId)?.replies ?? [];
      setRepliesByPost((current) => {
        const unique = new Map<string, FeedReply>();
        [...legacy, ...(current[postId] ?? []), ...fetched].forEach((reply) => unique.set(reply.id, reply));
        return { ...current, [postId]: [...unique.values()].sort((a, b) => a.createdAt - b.createdAt) };
      });
    } catch (failure) {
      console.error("[Atlasia] Yanıtlar yüklenemedi:", failure);
      setActionError("Yanıtlar yüklenemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      setLoadingReplies((current) => current.filter((id) => id !== postId));
    }
  };

  const markSeen = useCallback((id: string) => {
    setSeen((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setActionError(null);
    try {
      setPhoto(await uploadPhoto(file, "post"));
    } catch (failure) {
      console.error("[Atlasia] Topluluk fotoğrafı yüklenemedi:", failure);
      setActionError("Fotoğraf yüklenemedi. Bağlantını kontrol edip tekrar deneyebilirsin.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const publishPost = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if ((text.length < 2 && !photo) || sending) return;
    setSending(true);
    const saved = await runCloudAction(() => onAddPost({
      author: author(),
      text,
      photo: photo ?? undefined,
      ...(attachPlace
        ? { placeLabel: placeForPost.label, lng: placeForPost.lng, lat: placeForPost.lat }
        : {}),
    }), "Gönderi kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
    setSending(false);
    if (!saved) return;
    setDraft("");
    setPhoto(null);
    setTab("all");
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const publishReply = async (postId: string) => {
    const text = replyText.trim();
    if (text.length < 2) return;
    const saved = await runCloudAction(
      () => onAddReply(postId, author(), text),
      "Yanıt kaydedilemedi. Bağlantını kontrol edip tekrar dene.",
    );
    if (!saved) return;
    setReplyText("");
    setReplyFor(null);
    setExpanded((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
    await loadRepliesForPost(postId);
  };

  const publishStory = async (data: {
    text: string;
    accent: StoryAccent;
    author: string;
    attachPlace: boolean;
    photo: string | null;
  }) => {
    storageSet("atlasia.author", data.author);
    await onAddStory({
      author: data.author,
      text: data.text,
      accent: data.accent,
      photo: data.photo ?? undefined,
      ...(data.attachPlace
        ? { placeLabel: placeForPost.label, lng: placeForPost.lng, lat: placeForPost.lat }
        : {}),
    });
    setComposerOpen(false);
    setStoryIndex(0);
  };

  const goToStory = (s: Story) => {
    if (s.lng === undefined || s.lat === undefined) return;
    setStoryIndex(null);
    onGoTo(s.lng, s.lat, s.placeLabel ?? "Haritadaki konum");
  };

  const liked = (p: FeedPost) => (p.likedBy ?? []).includes(clientId);
  const likeCount = (p: FeedPost) => totalLikes(p);

  if (!open) {
    return (
      <button
        onClick={onOpen}
        className="group fixed bottom-4 left-4 z-30 hidden items-center gap-2.5 rounded-full border border-leaf/25 bg-ink/85 py-2.5 pr-4 pl-3 text-[13px] text-mint shadow-xl shadow-black/50 backdrop-blur-xl transition hover:border-leaf/60 hover:text-white lg:flex"
        aria-label="İzleri aç"
      >
        <span className="relative grid size-7 place-items-center rounded-full bg-leaf/15">
          <MessagesSquare className="size-4 text-leaf" />
          {unseenCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-sun ring-2 ring-ink" />
          )}
        </span>
        İzler
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] leading-none text-mint/70">
          {posts.length}
        </span>
      </button>
    );
  }

  return (
    <>
      <section
        className={cn(
          "social-panel animate-rise fixed z-50 flex flex-col overflow-hidden border border-leaf/20 bg-[#021915]/92 shadow-2xl shadow-black/70 backdrop-blur-2xl md:z-40",
          "inset-x-0 bottom-[calc(70px+env(safe-area-inset-bottom))] h-[min(74dvh,650px)] rounded-t-[28px] rounded-b-[18px] pb-0 md:bottom-0 md:h-[82dvh] md:rounded-b-none",
          "lg:inset-x-auto lg:bottom-4 lg:left-4 lg:h-[min(64vh,600px)] lg:w-[380px] lg:rounded-[26px] lg:pb-0",
        )}
        aria-label="İzler"
      >
        {/* Başlık */}
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3.5">
          <h2 className="font-display text-[17px] font-semibold tracking-tight text-white">İzler</h2>
          <span className="text-[13px] text-mint/55">{posts.length} ipucu</span>

          <button
            type="button"
            onClick={() => setGroupsOpen(true)}
            className="ml-auto flex min-h-9 items-center gap-1.5 rounded-full border border-leaf/25 px-3 text-[11.5px] text-leaf transition hover:bg-leaf/10"
          >
            <UsersRound className="size-3.5" />Gruplar
          </button>
          <button
            onClick={onClose}
            aria-label="İzler panelini küçült"
            className="grid size-11 place-items-center rounded-full text-mint/60 transition hover:bg-white/10 hover:text-white"
          >
            <Minus className="size-4" />
          </button>
        </div>

        {/* Story şeridi */}
        <div className="no-scrollbar flex shrink-0 gap-3 overflow-x-auto border-b border-white/[0.07] px-4 py-3">
          <button
            onClick={() => setComposerOpen(true)}
            className="flex w-[58px] shrink-0 flex-col items-center gap-1.5"
          >
            <span className="relative grid size-[52px] place-items-center rounded-full border border-dashed border-leaf/45 bg-leaf/[0.07] text-leaf transition hover:bg-leaf/15">
              <Plus className="size-5" />
            </span>
            <span className="w-full truncate text-center text-[12px] text-mint/65">İz bırak</span>
          </button>

          {stories.map((s, i) => {
            const isSeen = seen.includes(s.id);
            const thumb = mediaUrl(s.photo);
            return (
              <button
                key={s.id}
                onClick={() => setStoryIndex(i)}
                className="flex w-[58px] shrink-0 flex-col items-center gap-1.5"
                title={s.text}
              >
                <span
                  className={cn(
                    "grid size-[52px] place-items-center rounded-full p-[2px] transition",
                    isSeen ? "story-ring-seen" : "story-ring",
                  )}
                >
                  <span className="grid size-full place-items-center overflow-hidden rounded-full bg-ink p-[2px]">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="size-full rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Avatar name={s.author} className="size-full" textClass="text-[13px]" />
                    )}
                  </span>
                </span>
                <span className="w-full truncate text-center text-[10.5px] text-mint/65">
                  {s.author}
                </span>
              </button>
            );
          })}

          {hasMoreStories && (
            <button
              type="button"
              onClick={() => void onLoadMoreStories()}
              disabled={loadingMoreStories}
              className="flex w-[58px] shrink-0 flex-col items-center gap-1.5 text-mint/65 disabled:opacity-45"
              aria-label="Daha eski story'leri yükle"
            >
              <span className="grid size-[52px] place-items-center rounded-full border border-white/15 bg-white/[0.04]">
                {loadingMoreStories ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              </span>
              <span className="w-full truncate text-center text-[10.5px]">Daha eski</span>
            </button>
          )}
        </div>

        {/* Sekmeler */}
        <div className="flex shrink-0 gap-1 px-3 pt-2.5">
          {(
            [
              ["all", "Tümü"],
              ["near", "Yakınımda"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] transition",
                tab === id ? "bg-white/[0.08] font-semibold text-white" : "text-mint/55 hover:text-mint",
              )}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto self-center pr-1 text-[11px] text-mint/40">
            {visiblePosts.length} gönderi
          </span>
        </div>

        {actionError && (
          <div role="alert" className="mx-3 mt-2 flex items-start gap-2 rounded-xl border border-red-300/20 bg-red-400/[0.08] px-3 py-2 text-[11.5px] leading-relaxed text-red-200">
            <span className="min-w-0 flex-1">{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} aria-label="Hata mesajını kapat" className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-white/10"><X className="size-3.5" /></button>
          </div>
        )}

        {/* Gönderiler */}
        <div ref={listRef} className="thin-scroll flex-1 overflow-y-auto px-3 py-2">
          {visiblePosts.length === 0 && (
            <div className="px-3 py-10 text-center">
              <Sparkles className="mx-auto mb-2 size-5 text-leaf/70" />
              <p className="text-[12.5px] text-mint/60">
                Bu bölgede henüz konuşma yok.
                <br />
                İlk notu sen bırak.
              </p>
            </div>
          )}

          {visiblePosts.map((p) => {
            const isOpen = expanded.includes(p.id);
            const postReplies = repliesByPost[p.id] ?? p.replies;
            const repliesLoading = loadingReplies.includes(p.id);
            const img = mediaUrl(p.photo);
            return (
              <article key={p.id} className="group border-b border-white/[0.06] px-1.5 py-3 last:border-0">
                <div className="flex gap-2.5">
                  <Avatar name={p.author} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-semibold text-white">{p.author}</span>
                      <span className="shrink-0 text-[11px] text-mint/40">
                        · {relativeTime(p.createdAt)}
                      </span>
                      {p.kind === "user" && p.authorUid === currentUid && (
                        <button
                          onClick={() => void runCloudAction(
                            () => onRemovePost(p.id),
                            "Gönderi silinemedi. Bağlantını kontrol edip tekrar dene.",
                          )}
                          aria-label="Gönderiyi sil"
                          className="ml-auto shrink-0 text-mint/50 opacity-70 transition hover:text-red-300 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                      {p.authorUid && p.authorUid !== currentUid && (
                        <div className="relative ml-auto">
                          <button type="button" onClick={() => setMenuPostId(menuPostId === p.id ? null : p.id)} aria-label="Gönderi menüsü" className="grid size-7 place-items-center rounded-full text-mint/40 hover:bg-white/10 hover:text-mint">
                            <MoreHorizontal size={14} />
                          </button>
                          {menuPostId === p.id && (
                            <div className="absolute right-0 top-8 z-10 w-44 rounded-xl border border-white/10 bg-[#0a221b] p-1 shadow-xl">
                              <button type="button" onClick={() => { setMenuPostId(null); setReportPost(p); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] text-mint/80 hover:bg-white/5"><Flag size={14} />Bildir</button>
                              <button type="button" onClick={async () => {
                                if (!p.authorUid) return;
                                if (!confirm(`${p.author} kullanıcısını engellemek istiyor musun?`)) return;
                                setMenuPostId(null);
                                try { await blockUser(p.authorUid, currentUid); setActionError(`${p.author} engellendi.`); } catch (e) { setActionError(friendlyDataError(e, "Kullanıcı engellenemedi.")); }
                              }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] text-mint/80 hover:bg-white/5"><Ban size={14} />Engelle</button>
                              <button type="button" onClick={() => setMenuPostId(null)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-mint/50">Kapat</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {p.text && (
                      <p className="mt-1 text-[13px] leading-[1.5] whitespace-pre-line text-mint/85">
                        {p.text}
                      </p>
                    )}

                    {img && (
                      <img
                        src={img}
                        alt=""
                        loading="lazy"
                        className="mt-2 max-h-[220px] w-full rounded-xl object-cover ring-1 ring-white/10"
                      />
                    )}

                    {p.placeLabel && p.lng !== undefined && p.lat !== undefined && (
                      <button
                        onClick={() => onGoTo(p.lng!, p.lat!, p.placeLabel!)}
                        className="mt-2 flex max-w-full items-center gap-1.5 rounded-full border border-leaf/20 bg-leaf/[0.07] px-2.5 py-1 text-[11px] text-mint/80 transition hover:border-leaf/50 hover:text-white"
                      >
                        <MapPin className="size-3 shrink-0 text-leaf" />
                        <span className="truncate">{p.placeLabel}</span>
                      </button>
                    )}

                    <div className="mt-2 flex items-center gap-4">
                      <button
                        onClick={() => void runCloudAction(
                          () => onToggleLike(p.id),
                          "Beğeni kaydedilemedi. Bağlantını kontrol edip tekrar dene.",
                        )}
                        aria-pressed={liked(p)}
                        className={cn(
                          "flex items-center gap-1.5 text-[11.5px] transition",
                          liked(p) ? "text-sun" : "text-mint/50 hover:text-mint",
                        )}
                      >
                        <Heart className={cn("size-3.5", liked(p) && "fill-sun")} />
                        {likeCount(p)}
                      </button>
                      <button
                        onClick={() => {
                          setReplyFor(replyFor === p.id ? null : p.id);
                          setReplyText("");
                          setExpanded((prev) => (prev.includes(p.id) ? prev : [...prev, p.id]));
                          void loadRepliesForPost(p.id);
                          requestAnimationFrame(() => replyInputRef.current?.focus());
                        }}
                        className="flex items-center gap-1.5 text-[11.5px] text-mint/50 transition hover:text-mint"
                      >
                        <MessageCircle className="size-3.5" />
                        Yanıtla
                      </button>
                      <button
                        onClick={() => {
                          setExpanded((prev) =>
                            isOpen ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                          );
                          if (!isOpen) void loadRepliesForPost(p.id);
                        }}
                        className="text-[11.5px] text-leaf/80 transition hover:text-leaf"
                      >
                        {isOpen ? "Yanıtları gizle" : postReplies.length ? `${postReplies.length} yanıt` : "Yanıtları gör"}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="mt-2.5 space-y-2.5 border-l border-white/10 pl-3">
                        {repliesLoading ? (
                          <p className="text-[11px] text-mint/50">Yanıtlar yükleniyor…</p>
                        ) : postReplies.length === 0 ? (
                          <p className="text-[11px] text-mint/50">Henüz yanıt yok.</p>
                        ) : postReplies.map((r) => (
                          <div key={r.id} className="flex gap-2">
                            <Avatar name={r.author} className="size-6" textClass="text-[10px]" />
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-1.5">
                                <span className="truncate text-[11.5px] font-semibold text-white/90">
                                  {r.author}
                                </span>
                                <span className="shrink-0 text-[10.5px] text-mint/40">
                                  · {relativeTime(r.createdAt)}
                                </span>
                              </p>
                              <p className="mt-0.5 text-[12px] leading-snug text-mint/75">{r.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyFor === p.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void publishReply(p.id);
                        }}
                        className="mt-2.5 flex items-center gap-2 rounded-full border border-leaf/25 bg-ink/70 py-1 pr-1 pl-3"
                      >
                        <CornerDownRight className="size-3.5 shrink-0 text-leaf/70" />
                        <input
                          ref={replyInputRef}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          maxLength={200}
                          placeholder={`${p.author} kullanıcısına yanıt ver…`}
                          className="min-w-0 flex-1 bg-transparent py-1.5 text-[12px] text-mint outline-none placeholder:text-mint/70 focus:ring-2 focus:ring-sun/40 rounded-md"
                        />
                        <button
                          type="submit"
                          disabled={replyText.trim().length < 2}
                          aria-label="Yanıtı gönder"
                          className="grid size-7 shrink-0 place-items-center rounded-full bg-leaf text-ink transition disabled:opacity-35"
                        >
                          <Send className="size-3.5" strokeWidth={2.4} />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {hasMorePosts && (
            <button
              type="button"
              onClick={() => void onLoadMorePosts()}
              disabled={loadingMorePosts}
              className="mx-auto my-3 flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-[12px] font-semibold text-mint/75 transition hover:border-leaf/45 hover:text-white disabled:opacity-45"
            >
              {loadingMorePosts && <Loader2 className="size-3.5 animate-spin" />}
              Daha eski gönderileri yükle
            </button>
          )}
        </div>

        {/* Yazma alanı */}
        <form onSubmit={publishPost} className="shrink-0 border-t border-white/[0.07] bg-black/20 px-3 py-2.5">
          {photo && (
            <div className="relative mb-2 ml-10 w-fit">
              <img
                src={mediaUrl(photo)}
                alt=""
                className="h-16 rounded-lg object-cover ring-1 ring-white/15"
              />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                aria-label="Fotoğrafı kaldır"
                className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-ink text-mint/80 ring-1 ring-white/20 transition hover:text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <Avatar name={author()} className="size-8" />
            <div className="min-w-0 flex-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void publishPost();
                  }
                }}
                rows={1}
                maxLength={280}
                placeholder="Gördüğün, duyduğun, tavsiye ettiğin bir şey…"
                className="thin-scroll max-h-[76px] w-full resize-none rounded-2xl border border-white/10 bg-ink px-3 py-2 text-[12.5px] leading-snug text-white outline-none transition placeholder:text-mint/70 focus:border-sun/60 focus:ring-2 focus:ring-sun/40"
              />
              <div className="mt-1.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAttachPlace((v) => !v)}
                  className={cn(
                    "flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition",
                    attachPlace
                      ? "border-leaf/40 bg-leaf/10 text-mint/85"
                      : "border-white/10 text-mint/45 hover:text-mint",
                  )}
                  title="Gönderiye konumu ekle"
                >
                  <MapPin className={cn("size-3 shrink-0", attachPlace ? "text-leaf" : "")} />
                  <span className="max-w-[120px] truncate">{placeForPost.label}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!precise) {
                      onRequestPrecise();
                      setUsePrecise(true);
                      return;
                    }
                    setUsePrecise((v) => !v);
                  }}
                  title="Tam konumunu kullan"
                  aria-pressed={usePrecise && !!precise}
                  className={cn(
                    "grid size-[26px] shrink-0 place-items-center rounded-full border transition",
                    usePrecise && precise
                      ? "border-leaf/60 bg-leaf/15 text-leaf"
                      : "border-white/10 text-mint/45 hover:text-mint",
                  )}
                >
                  <Crosshair className="size-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  title="Fotoğraf ekle"
                  className="grid size-[26px] shrink-0 place-items-center rounded-full border border-white/10 text-mint/45 transition hover:text-mint disabled:opacity-40"
                >
                  {uploading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="size-3.5" />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => void pickPhoto(e.target.files?.[0])}
                />

                <span className="ml-auto shrink-0 text-[10px] text-mint/35">{draft.length}/280</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={(draft.trim().length < 2 && !photo) || sending}
              aria-label="Gönder"
              className="mb-[26px] grid size-9 shrink-0 place-items-center rounded-full bg-sun text-ink transition hover:bg-sun-2 active:scale-95 disabled:opacity-35"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" strokeWidth={2.4} />
              )}
            </button>
          </div>
        </form>
      </section>

      {storyIndex !== null && stories[storyIndex] && (
        <StoryViewer
          stories={stories}
          startIndex={storyIndex}
          onClose={() => setStoryIndex(null)}
          onSeen={markSeen}
          onGoTo={goToStory}
          canDelete={(story) => story.authorUid === currentUid}
          onDelete={(id) => {
            void runCloudAction(
              () => onRemoveStory(id),
              "Story silinemedi. Bağlantını kontrol edip tekrar dene.",
            );
          }}
        />
      )}

      {composerOpen && (
        <StoryComposer
          place={placeForPost}
          defaultAuthor={storageGet("atlasia.author") ?? ""}
          uploadPhoto={uploadPhoto}
          onClose={() => setComposerOpen(false)}
          onPublish={publishStory}
        />
      )}
      {reportPost && (
        <ReportDialog targetType="post" targetId={reportPost.id} targetOwnerUid={reportPost.authorUid} targetLabel={reportPost.text.slice(0,40)} reporterUid={currentUid} onClose={() => setReportPost(null)} onReported={() => setActionError("Raporun alındı, inceleyeceğiz.")} />
      )}
      {groupsOpen && (
        <GroupsPanel currentUid={currentUid} currentName={author()} blockedSet={blockedSet} isBlocked={isBlocked} initialGroupId={pendingGroupId} onClose={() => setGroupsOpen(false)} />
      )}
    </>
  );
}
