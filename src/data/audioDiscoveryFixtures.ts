// Test verisi üretimde ağdan yüklenen dosyayla aynıdır.
import tours from "../../public/assets/efes-tour.json";
import type { AudioDiscoveryTour } from "./audioDiscovery";
export const AUDIO_DISCOVERY_TOURS = tours as AudioDiscoveryTour[];
