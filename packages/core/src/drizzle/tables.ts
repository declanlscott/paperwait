import { pgTable, primaryKey } from "drizzle-orm/pg-core";

import { generateId } from "../utils/shared";
import { id, timestamps } from "./columns";

import type { BuildColumns, BuildExtraConfigColumns } from "drizzle-orm";
import type {
  PgColumnBuilderBase,
  PgTableExtraConfigValue,
  PgTableWithColumns,
} from "drizzle-orm/pg-core";

/**
 * IDs for tenant owned tables (used as composite primary key)
 */
export const tenantIdColumns = {
  get id() {
    return id("id").$defaultFn(generateId).notNull();
  },
  get tenantId() {
    return id("tenant_id").notNull();
  },
};

/**
 * Wrapper for tenant owned tables with timestamps and default ID
 */
export const tenantTable = <
  TTableName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
>(
  name: TTableName,
  columns: TColumnsMap,
  extraConfig?: (
    self: BuildExtraConfigColumns<
      TTableName,
      TColumnsMap & typeof tenantIdColumns & typeof timestamps,
      "pg"
    >,
  ) => Array<PgTableExtraConfigValue>,
): PgTableWithColumns<{
  name: TTableName;
  schema: undefined;
  columns: BuildColumns<
    TTableName,
    TColumnsMap & typeof tenantIdColumns & typeof timestamps,
    "pg"
  >;
  dialect: "pg";
}> =>
  pgTable(name, { ...tenantIdColumns, ...timestamps, ...columns }, (table) => [
    primaryKey({ columns: [table.id, table.tenantId] }),
    ...(extraConfig?.(table) ?? []),
  ]);
