import { cn } from "../utils/cn";

const PALETTE = [
  "from-[#2f8f5a] to-[#0b2c1d]",
  "from-[#1f8fa6] to-[#0a3446]",
  "from-[#b5622f] to-[#2e140a]",
  "from-[#7a4fa3] to-[#1d1033]",
  "from-[#c0903a] to-[#33210a]",
  "from-[#2f7f8f] to-[#0c262d]",
  "from-[#6a7f3a] to-[#1c2a10]",
  "from-[#a34a4a] to-[#2b0f0f]",
];

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "G";
  const first = parts[0][0] ?? "";
  const second = parts.length > 1 ? (parts[1][0] ?? "") : "";
  return (first + second).toLocaleUpperCase("tr");
}

interface Props {
  name: string;
  className?: string;
  textClass?: string;
}

export default function Avatar({ name, className, textClass }: Props) {
  const tone = PALETTE[hashCode(name) % PALETTE.length];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white/95 ring-1 ring-white/10",
        tone,
        className ?? "size-9",
        textClass ?? "text-[12px]",
      )}
    >
      {initials(name)}
    </span>
  );
}
