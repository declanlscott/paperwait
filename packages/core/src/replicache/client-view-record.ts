import * as R from "remeda";
import * as v from "valibot";

import { InternalServerError } from "../errors/http";
import { Domain } from "../schemas/replicache";
import { validate } from "../valibot";

import type { DomainsMetadata, Metadata } from "../data/search";

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

export function buildCvr(
  args:
    | { variant: "base"; prev?: ClientViewRecord }
    | { variant: "next"; metadata: DomainsMetadata },
): ClientViewRecord {
  const variant = args.variant;

  switch (variant) {
    case "base":
      return (
        args.prev ?? {
          organization: {},
          user: {},
          papercutAccount: {},
          papercutAccountCustomerAuthorization: {},
          papercutAccountManagerAuthorization: {},
          room: {},
          product: {},
          announcement: {},
          order: {},
          comment: {},
          client: {},
        }
      );
    case "next":
      return {
        organization: buildCvrEntries(args.metadata.organization),
        user: buildCvrEntries(args.metadata.user),
        papercutAccount: buildCvrEntries(args.metadata.papercutAccount),
        papercutAccountCustomerAuthorization: buildCvrEntries(
          args.metadata.papercutAccountCustomerAuthorization,
        ),
        papercutAccountManagerAuthorization: buildCvrEntries(
          args.metadata.papercutAccountManagerAuthorization,
        ),
        room: buildCvrEntries(args.metadata.room),
        announcement: buildCvrEntries(args.metadata.announcement),
        product: buildCvrEntries(args.metadata.product),
        order: buildCvrEntries(args.metadata.order),
        comment: buildCvrEntries(args.metadata.comment),
        client: buildCvrEntries(args.metadata.client),
      };
    default:
      variant satisfies never;
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new InternalServerError(`Unknown cvr variant: ${variant}`);
  }
}

export const diffCvr = (prev: ClientViewRecord, next: ClientViewRecord) =>
  R.unique([
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
