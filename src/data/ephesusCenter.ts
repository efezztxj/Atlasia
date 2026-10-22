/**
 * Efes merkez koordinatı ayrı modülde: App bunu statik import eder.
 * Fixture verisinin tamamı (ephesusFixture.ts) yalnız historicSites lazy chunk'ında kalmalı;
 * aynı modülden statik import edilirse Rollup bütün fixture'ı entry'ye taşır.
 */
export const EPHESUS_CENTER = { lat: 37.9395, lng: 27.3417 } as const;
