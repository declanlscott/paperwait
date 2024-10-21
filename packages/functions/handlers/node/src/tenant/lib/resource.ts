export function getResource<TResource extends Record<string, unknown>>(
  prefix: string,
  input: Record<string, string | undefined>,
): TResource {
  const raw = Object.entries(input).reduce(
    (raw, [key, value]) => {
      if (key.startsWith(prefix) && value)
        raw[key.slice(prefix.length)] = JSON.parse(value);

      return raw;
    },
    {} as Record<string, unknown>,
  );

  return new Proxy(raw, {
    get(target, prop: string) {
      if (prop in target) return target[prop];

      throw new Error(`Resource "${prop}" not linked.`);
    },
  }) as TResource;
}
