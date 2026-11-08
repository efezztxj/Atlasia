/**
 * Test verisi üretimde ağdan yüklenen dosyayla **aynıdır**.
 *
 * `public/assets/sesli-turlar.json` tek kaynaktır; burada yalnız `tours`
 * dizisi dışarı alınır. Testler böylece gerçek duraklarla, gerçek numaralarla
 * ve gerçek ses yollarıyla koşar — sentetik veriyle değil.
 */
import payload from "../../public/assets/sesli-turlar.json";
import type { AudioDiscoveryTour } from "./audioDiscovery";

export const AUDIO_DISCOVERY_TOURS = payload.tours as AudioDiscoveryTour[];
