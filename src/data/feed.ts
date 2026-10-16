import type { StoryAccent } from "../types";

export const STORY_ACCENTS: Record<StoryAccent, { label: string; bg: string; dot: string }> = {
  sun: {
    label: "Gün ışığı",
    bg: "bg-[radial-gradient(120%_120%_at_20%_0%,#f3c870_0%,#b5802a_45%,#2c1f06_100%)]",
    dot: "bg-[#eab54f]",
  },
  leaf: {
    label: "Yeşil",
    bg: "bg-[radial-gradient(120%_120%_at_20%_0%,#7ff0c0_0%,#1f8f68_45%,#05241c_100%)]",
    dot: "bg-[#5be0a6]",
  },
  sea: {
    label: "Deniz",
    bg: "bg-[radial-gradient(120%_120%_at_20%_0%,#7fd3f0_0%,#1b6d94_45%,#051c28_100%)]",
    dot: "bg-[#4fb3d9]",
  },
  dusk: {
    label: "Alacakaranlık",
    bg: "bg-[radial-gradient(120%_120%_at_20%_0%,#d2a0f0_0%,#6a3f96_45%,#160a24_100%)]",
    dot: "bg-[#b07ad6]",
  },
};
