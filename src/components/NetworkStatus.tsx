import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, []);

  if (online) return null;

  return (
    <div role="status" className="fixed top-[max(12px,env(safe-area-inset-top))] left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-full border border-sun/30 bg-[#06221b]/95 px-4 py-2 text-[12px] whitespace-nowrap text-sun shadow-xl">
      <WifiOff className="size-4" />Çevrimdışısın · canlı harita ve hesap işlemleri sınırlı
    </div>
  );
}
