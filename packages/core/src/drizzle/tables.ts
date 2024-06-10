import { pgTable, primaryKey } from "drizzle-orm/pg-core";
import * as v from "valibot";

import { generateId, NanoId } from "../id";
import { Organization } from "../organization/organization.sql";
import { id, timestamps, TimestampsSchema } from "./columns";

import type { BuildColumns } from "drizzle-orm";
import type {
  PgColumnBuilderBase,
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

export const OrgTableSchema = v.object({
  id: NanoId,
  orgId: NanoId,
  ...TimestampsSchema.entries,
});
