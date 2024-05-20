import { array, parse } from "valibot";

import { Domain } from "./schemas";

import type { Metadata } from "./metadata";

export type ClientViewRecord = Record<Domain, ClientViewRecordEntries>;
export type ClientViewRecordEntries = Record<
  Metadata["id"],
  Metadata["rowVersion"]
>;
export type ClientViewRecordDiff = Record<Domain, ClientViewRecordDiffEntry>;
export type ClientViewRecordDiffEntry = {
  puts: Array<Metadata["id"]>;
  dels: Array<Metadata["id"]>;
};

export function buildCvrEntries(domainMetadata: Array<Metadata>) {
  return domainMetadata.reduce((entries, { id, rowVersion }) => {
    entries[id] = rowVersion;
    return entries;
  }, {} as ClientViewRecordEntries);
}

type ClientViewRecordEntryRowVersion =
  ClientViewRecordEntries[keyof ClientViewRecordEntries];

export function diffCvr(prev: ClientViewRecord, next: ClientViewRecord) {
  const domains = new Set<Domain>([
    ...parse(array(Domain), Object.keys(prev)),
    ...parse(array(Domain), Object.keys(next)),
  ]);

  let prevEntries: ClientViewRecordEntries;
  let nextEntries: ClientViewRecordEntries;
  const diff = {} as ClientViewRecordDiff;
  let prevRowVersion: ClientViewRecordEntryRowVersion;
  let nextRowVersion: ClientViewRecordEntryRowVersion;
  for (const domain of domains) {
    prevEntries = prev[domain];
    nextEntries = next[domain];

    diff[domain] = {
      puts: Object.keys(nextEntries).filter((id) => {
        prevRowVersion = prevEntries[id];
        nextRowVersion = nextEntries[id];

        return prevRowVersion === undefined || prevRowVersion < nextRowVersion;
      }),
      dels: Object.keys(prevEntries).filter((id) => {
        prevRowVersion = prevEntries[id];
        nextRowVersion = nextEntries[id];

        return nextRowVersion === undefined;
      }),
    };
  }

  return diff;
}

export function isCvrDiffEmpty(diff: ClientViewRecordDiff) {
  return Object.values(diff).every(
    ({ puts, dels }) => puts.length === 0 && dels.length === 0,
  );
}
