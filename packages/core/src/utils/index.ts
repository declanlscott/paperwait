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
