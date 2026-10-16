const HOST_PATTERN = /^\.?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

/** Vite host iznini yalnız açıkça yazılmış alan adlarıyla sınırlar. */
export function parseAllowedHosts(value?: string): string[] {
  if (!value?.trim()) return [];
  const hosts = [...new Set(value.split(",").map((host) => host.trim()).filter(Boolean))];
  const invalid = hosts.find((host) => host === "*" || !HOST_PATTERN.test(host));
  if (invalid) throw new Error(`Geçersiz ATLASIA_ALLOWED_HOSTS girdisi: ${invalid}`);
  return hosts;
}
