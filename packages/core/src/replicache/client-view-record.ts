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

export const buildCvrEntries = (domainMetadata: Array<Metadata>) =>
  domainMetadata.reduce((entries, { id, rowVersion }) => {
    entries[id] = rowVersion;

    return entries;
  }, {} as ClientViewRecordEntries);

export const diffCvr = (prev: ClientViewRecord, next: ClientViewRecord) =>
  unique([
    ...validate(v.array(Domain), Object.keys(prev)),
    ...validate(v.array(Domain), Object.keys(next)),
  ]).reduce((diff, domain) => {
    const prevDomain = prev[domain] ?? {};
    const nextDomain = next[domain] ?? {};

    diff[domain] = {
      puts: Object.keys(nextDomain).filter(
        (id) => prevDomain[id] === undefined || prevDomain[id] < nextDomain[id],
      ),
      dels: Object.keys(prevDomain).filter(
        (id) => nextDomain[id] === undefined,
      ),
    };

    return diff;
  }, {} as ClientViewRecordDiff);

export const isCvrDiffEmpty = (diff: ClientViewRecordDiff) =>
  Object.values(diff).every(
    ({ puts, dels }) => puts.length === 0 && dels.length === 0,
  );
