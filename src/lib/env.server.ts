export function getServerEnv(name: string) {
  const processValue = typeof process !== "undefined" ? process.env?.[name] : undefined;
  const importMetaValue = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[name];
  const denoValue = (globalThis as unknown as { Deno?: { env?: { get?: (key: string) => string | undefined } } }).Deno?.env?.get?.(name);

  return [processValue, importMetaValue, denoValue].find((value) => value?.trim())?.trim() ?? "";
}

export function getFirstServerEnv(names: string[]) {
  for (const name of names) {
    const value = getServerEnv(name);
    if (value) return value;
  }
  return "";
}
