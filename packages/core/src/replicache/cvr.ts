import type { Metadata, MetadataSymbol } from "./metadata";

export type Cvr = Record<string, ReturnType<typeof buildCvrEntries>>;

export function buildCvrEntries<
  TId extends MetadataSymbol,
  TRowVersion extends MetadataSymbol,
>(entities: Array<Metadata<TId, TRowVersion>>) {
  return entities.reduce(
    (entries, { id, rowVersion }) => {
      entries[id] = rowVersion;
      return entries;
    },
    {} as Record<TId, TRowVersion>,
  );
}

export function diffCvr(prev: Cvr, next: Cvr) {
  return;
}
