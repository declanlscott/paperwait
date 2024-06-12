import { unique } from "remeda";
import * as v from "valibot";

import { validate } from "../valibot";
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

export function diffCvr(prev: ClientViewRecord, next: ClientViewRecord) {
  return unique([
    ...validate(v.array(Domain), Object.keys(prev)),
    ...validate(v.array(Domain), Object.keys(next)),
  ]).reduce((diff, domain) => {
    diff[domain] = {
      puts: Object.keys(next[domain]).filter(
        (id) =>
          prev[domain][id] === undefined || prev[domain][id] < next[domain][id],
      ),
      dels: Object.keys(prev[domain]).filter(
        (id) => next[domain][id] === undefined,
      ),
    };

    return diff;
  }, {} as ClientViewRecordDiff);
}

export function isCvrDiffEmpty(diff: ClientViewRecordDiff) {
  return Object.values(diff).every(
    ({ puts, dels }) => puts.length === 0 && dels.length === 0,
  );
}
