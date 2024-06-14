import type { PrefixedRecord } from "../types/utils";

export function createPrefixedRecord<
  TKey extends string,
  TPrefix extends string,
>(prefix: TPrefix, keys: TKey[]): PrefixedRecord<TPrefix, TKey> {
  return keys.reduce(
    (prefixedRecord, key) => {
      prefixedRecord[key] = `${prefix}${key}`;

      return prefixedRecord;
    },
    {} as PrefixedRecord<TPrefix, TKey>,
  );
}

export function getUserInitials(name: string) {
  if (!name) return "";

  const splitName = name.split(" ");
  const firstInitial = splitName[0].charAt(0).toUpperCase();

  if (splitName.length === 1) return firstInitial;

  const lastInitial = splitName[splitName.length - 1].charAt(0).toUpperCase();

  return `${firstInitial}${lastInitial}`;
}
