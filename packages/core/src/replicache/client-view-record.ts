import * as R from "remeda";

import { InternalServerError } from "../errors/http";
import { syncedTables } from "./metadata";
import { ReplicacheClient } from "./replicache.sql";

import type { Metadata, SyncedTableMetadata, TableName } from "./metadata";

export type ClientViewRecord = Record<TableName, ClientViewRecordEntries>;
export type ClientViewRecordEntries = Record<
  Metadata["id"],
  Metadata["rowVersion"]
>;
export type ClientViewRecordDiff = Record<TableName, ClientViewRecordDiffEntry>;
export type ClientViewRecordDiffEntry = {
  puts: Array<Metadata["id"]>;
  dels: Array<Metadata["id"]>;
};

export const buildCvrEntries = (tableMetadata: Array<Metadata>) =>
  tableMetadata.reduce((entries, { id, rowVersion }) => {
    entries[id] = rowVersion;
    return entries;
  }, {} as ClientViewRecordEntries);

export function buildCvr(
  args:
    | {
        variant: "base";
        prev?: ClientViewRecord;
      }
    | {
        variant: "next";
        metadata: {
          clients: Array<Metadata>;
          syncedTables: Array<SyncedTableMetadata>;
        };
      },
) {
  const variant = args.variant;

  switch (variant) {
    case "base":
      return (
        args.prev ??
        syncedTables.reduce(
          (baseCvr, table) => {
            baseCvr[table._.name] = {};
            return baseCvr;
          },
          { [ReplicacheClient._.name]: {} } as ClientViewRecord,
        )
      );
    case "next":
      return args.metadata.syncedTables.reduce(
        (nextCvr, [name, metadata]) => {
          nextCvr[name] = buildCvrEntries(metadata);
          return nextCvr;
        },
        {
          [ReplicacheClient._.name]: buildCvrEntries(args.metadata.clients),
        } as ClientViewRecord,
      );
    default:
      variant satisfies never;
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new InternalServerError(`Unknown cvr variant: ${variant}`);
  }
}

export const diffCvr = (prev: ClientViewRecord, next: ClientViewRecord) =>
  R.pipe(
    { ...prev, ...next },
    R.keys(),
    R.unique(),
    R.reduce((diff, name) => {
      const prevEntries = prev[name] ?? {};
      const nextEntries = next[name] ?? {};

      diff[name] = {
        puts: R.pipe(
          nextEntries,
          R.keys(),
          R.filter(
            (id) =>
              prevEntries[id] === undefined ||
              prevEntries[id] < nextEntries[id],
          ),
        ),
        dels: R.pipe(
          prevEntries,
          R.keys(),
          R.filter((id) => nextEntries[id] === undefined),
        ),
      };

      return diff;
    }, {} as ClientViewRecordDiff),
  );

export const isCvrDiffEmpty = (diff: ClientViewRecordDiff) =>
  Object.values(diff).every(
    ({ puts, dels }) => puts.length === 0 && dels.length === 0,
  );
