import {
  Building2,
  Camera,
  Compass,
  CircleAlert,
  Landmark,
  Sparkles,
  Sprout,
  Tent,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "../types";

export interface Category {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  /** Görseli olmayan yerler için kart arka planı */
  gradient: string;
}

export const CATEGORIES: Category[] = [
  { id: "cities", label: "Şehirler", icon: Building2, gradient: "from-[#1b4d6b] to-[#0b1f33]" },
  { id: "beaches", label: "Plajlar", icon: Waves, gradient: "from-[#1f8fa6] to-[#0a3446]" },
  { id: "history", label: "Tarih", icon: Landmark, gradient: "from-[#8a6a3a] to-[#2b1f10]" },
  { id: "nature", label: "Doğa", icon: Sprout, gradient: "from-[#2f8f5a] to-[#0b2c1d]" },
  { id: "camp", label: "Kamp", icon: Tent, gradient: "from-[#6a7f3a] to-[#1c2a10]" },
  { id: "food", label: "Yeme içme", icon: UtensilsCrossed, gradient: "from-[#b5622f] to-[#2e140a]" },
  { id: "photo", label: "Fotoğraf", icon: Camera, gradient: "from-[#7a4fa3] to-[#1d1033]" },
  { id: "routes", label: "Rotalar", icon: Compass, gradient: "from-[#2f7f8f] to-[#0c262d]" },
  { id: "community", label: "Topluluk", icon: Sparkles, gradient: "from-[#c0903a] to-[#33210a]" },
  { id: "issues", label: "Yerel sorunlar", icon: CircleAlert, gradient: "from-[#a34a4a] to-[#2b0f0f]" },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;
