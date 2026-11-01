import { describe, expect, it } from "vitest";
import { areAssistantPropsEqual } from "./AtlasAssistant";
import { areSocialPropsEqual } from "./SocialPanel";

type AssistantProps = Parameters<typeof areAssistantPropsEqual>[0];
type SocialProps = Parameters<typeof areSocialPropsEqual>[0];

// Gerçek kullanımda bu diziler `useMemo` ile sabit kimlik taşır; testte de öyle.
const PLACES: unknown[] = [];
const POSTS: unknown[] = [];
const STORIES: unknown[] = [];

/** Test için eksik alanlar bilinçli: karşılaştırıcı yalnız ilgili alanlara bakar. */
const assistant = (over: Record<string, unknown> = {}) => ({
  open: false,
  places: PLACES,
  view: { zoom: 5, lat: 38, lng: 27 },
  origin: { lat: 38, lng: 27, label: "İzmir" },
  ...over,
}) as unknown as AssistantProps;

const social = (over: Record<string, unknown> = {}) => ({
  open: false,
  view: { zoom: 5, lat: 38, lng: 27 },
  posts: POSTS,
  stories: STORIES,
  precise: null,
  hasMorePosts: false,
  ...over,
}) as unknown as SocialProps;

/*
 * Kasma turu: harita hareketi `view`'i güncellediğinde kapalı panellerin
 * yeniden render edilmesi gereksizdi (görünür tek şey başlatıcı düğmesi).
 */
describe("kapalı panel memo karşılaştırıcıları", () => {
  it("Atlas AI kapalıyken harita görünümü değişse de yeniden render etmez", () => {
    expect(areAssistantPropsEqual(assistant(), assistant({ view: { zoom: 9, lat: 40, lng: 29 } }))).toBe(true);
    expect(areAssistantPropsEqual(assistant(), assistant({ places: [{ id: "yeni" }] }))).toBe(true);
    // Satır içi geri çağrılar her render'da yeni kimlik alır; kapalıyken etkisizdir.
    expect(areAssistantPropsEqual(assistant(), assistant({ onOpen: () => {} }))).toBe(true);
  });

  it("Atlas AI kapalıyken başlatıcıyı etkileyen değişiklikte render eder", () => {
    expect(areAssistantPropsEqual(assistant(), assistant({ hiddenOnMobile: true }))).toBe(false);
    expect(areAssistantPropsEqual(assistant(), assistant({ dockExpanded: true }))).toBe(false);
  });

  it("Atlas AI açıldığında her zaman güncel veriyle render eder", () => {
    expect(areAssistantPropsEqual(assistant({ open: true }), assistant({ open: true }))).toBe(false);
    expect(areAssistantPropsEqual(assistant(), assistant({ open: true }))).toBe(false);
  });

  it("İzler paneli kapalıyken görünüm/konum değişimini yok sayar", () => {
    expect(areSocialPropsEqual(social(), social({ view: { zoom: 9, lat: 40, lng: 29 } }))).toBe(true);
    expect(areSocialPropsEqual(social(), social({ onOpen: () => {} }))).toBe(true);
  });

  it("İzler paneli kapalıyken sayaç ve konum verisi değişince render eder", () => {
    expect(areSocialPropsEqual(social(), social({ posts: [{ id: "p1" }] }))).toBe(false);
    // Rozet görülmemiş hikâye sayısından da beslenir: yeni hikâye bayat kalmamalı.
    expect(areSocialPropsEqual(social(), social({ stories: [{ id: "s1" }] }))).toBe(false);
    expect(areSocialPropsEqual(social(), social({ precise: { label: "İzmir", lng: 27, lat: 38, accuracy: 10 } }))).toBe(false);
    expect(areSocialPropsEqual(social(), social({ hasMorePosts: true }))).toBe(false);
  });

  it("İzler paneli açıldığında her zaman render eder", () => {
    expect(areSocialPropsEqual(social({ open: true }), social({ open: true }))).toBe(false);
  });
});
