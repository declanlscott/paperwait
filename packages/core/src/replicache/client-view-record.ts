import * as R from "remeda";

import { NonExhaustiveValue } from "../errors/misc";
import { syncedTables } from "./data";
import { replicacheClientsTable } from "./sql";

import type { Metadata, Table, TableMetadata, TableName } from "./data";

export type ClientViewRecord = {
  [TName in TableName]: ClientViewRecordEntries<
    Extract<Table, { _: { name: TName } }>
  >;
};
export type ClientViewRecordEntries<TTable extends Table> = Record<
  Metadata<TTable>["id"],
  Metadata<TTable>["rowVersion"]
>;
export type ClientViewRecordDiff = {
  [TName in TableName]: ClientViewRecordDiffEntry<
    Extract<Table, { _: { name: TName } }>
  >;
};
export type ClientViewRecordDiffEntry<TTable extends Table> = {
  puts: Array<Metadata<TTable>["id"]>;
  dels: Array<Metadata<TTable>["id"]>;
};

export const buildCvrEntries = <TTable extends Table>(
  tableMetadata: Array<Metadata<TTable>>,
) =>
  tableMetadata.reduce((entries, { id, rowVersion }) => {
    entries[id] = rowVersion;
    return entries;
  }, {} as ClientViewRecordEntries<TTable>);

export function buildCvr(
  args:
    | {
        variant: "base";
        prev?: ClientViewRecord;
      }
    | {
        variant: "next";
        metadata: Array<TableMetadata>;
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
          { [replicacheClientsTable._.name]: {} } as ClientViewRecord,
        )
      );
    case "next":
      return args.metadata.reduce((nextCvr, [name, metadata]) => {
        nextCvr[name] = buildCvrEntries(metadata);
        return nextCvr;
      }, {} as ClientViewRecord);
    default:
      throw new NonExhaustiveValue(variant);
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
