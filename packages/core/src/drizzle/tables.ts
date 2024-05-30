import { getTableColumns, sql } from "drizzle-orm";
import { pgTable, primaryKey } from "drizzle-orm/pg-core";

import { generateId } from "../nano-id";
import { Organization } from "../organization/organization.sql";
import { id, timestamps } from "./columns";

import type { BuildColumns, SQL } from "drizzle-orm";
import type {
  PgColumnBuilderBase,
  PgTable,
  PgTableExtraConfig,
} from "drizzle-orm/pg-core";

/**
 * IDs for organization owned tables (used as composite primary key)
 */
export const orgIdColumns = {
  get id() {
    return id("id").$defaultFn(generateId).notNull();
  },
  get orgId() {
    return id("org_id")
      .notNull()
      .references(() => Organization.id);
  },
};

/**
 * Wrapper for organization owned tables with timestamps and default ID
 */
export function orgTable<
  TTableName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
>(
  name: TTableName,
  columns: TColumnsMap,
  extraConfig?: (
    self: BuildColumns<
      TTableName,
      TColumnsMap & typeof orgIdColumns & typeof timestamps,
      "pg"
    >,
  ) => PgTableExtraConfig,
) {
  return pgTable(
    name,
    { ...orgIdColumns, ...timestamps, ...columns },
    (table) => ({
      primary: primaryKey({ columns: [table.id, table.orgId] }),
      ...extraConfig,
    }),
  );
}

export function buildConflictUpdateColumns<
  TTable extends PgTable,
  TColumnName extends keyof TTable["_"]["columns"],
>(table: TTable, columnNames: TColumnName[]) {
  const tableColumns = getTableColumns(table);

  return columnNames.reduce(
    (updateColumns, column) => {
      const columnName = tableColumns[column].name;

      updateColumns[column] = sql.raw(`excluded.${columnName}`);

      return updateColumns;
    },
    {} as Record<TColumnName, SQL>,
  );
}
