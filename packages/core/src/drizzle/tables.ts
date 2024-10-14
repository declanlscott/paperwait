import { pgTable, primaryKey } from "drizzle-orm/pg-core";

import { tenantsTable } from "../tenants/sql";
import { generateId } from "../utils/shared";
import { id, timestamps } from "./columns";

import type { BuildColumns } from "drizzle-orm";
import type {
  PgColumnBuilderBase,
  PgTableExtraConfig,
} from "drizzle-orm/pg-core";

/**
 * IDs for tenant owned tables (used as composite primary key)
 */
export const tenantIdColumns = {
  get id() {
    return id("id").$defaultFn(generateId).notNull();
  },
  get tenantId() {
    return id("tenant_id")
      .notNull()
      .references(() => tenantsTable.id);
  },
};

/**
 * Wrapper for tenant owned tables with timestamps and default ID
 */
export function tenantTable<
  TTableName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
>(
  name: TTableName,
  columns: TColumnsMap,
  extraConfig?: (
    self: BuildColumns<
      TTableName,
      TColumnsMap & typeof tenantIdColumns & typeof timestamps,
      "pg"
    >,
  ) => PgTableExtraConfig,
) {
  return pgTable(
    name,
    { ...tenantIdColumns, ...timestamps, ...columns },
    (table) => ({
      primary: primaryKey({ columns: [table.id, table.tenantId] }),
      ...extraConfig,
    }),
  );
}
