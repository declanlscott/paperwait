import { pgTable, primaryKey } from "drizzle-orm/pg-core";

import { generateId } from "../nano-id";
import { Organization } from "../organization/organization.sql";
import { id, timestamps } from "./columns";

import type { BuildColumns } from "drizzle-orm";
import type {
  PgColumnBuilderBase,
  PgTableExtraConfig,
} from "drizzle-orm/pg-core";

/**
 * IDs for organization owned tables (used as composite primary key)
 */
export function orgIdColumns(generateDefaultId = true) {
  return {
    id: generateDefaultId
      ? id("id").$defaultFn(generateId).notNull()
      : id("id").notNull(),
    orgId: id("org_id")
      .notNull()
      .references(() => Organization.id),
  };
}

export type OrgTableOptions = {
  generateDefaultId?: boolean;
  includeTimestamps?: boolean;
};

export const defaultOrgTableOptions = {
  generateDefaultId: true,
  includeTimestamps: true,
} satisfies OrgTableOptions;

/**
 * Wrapper for organization owned tables
 */
export function orgTable<
  TTableName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
>(
  name: TTableName,
  columns: TColumnsMap,
  options: {
    generateDefaultId?: boolean;
    includeTimestamps?: boolean;
  } = defaultOrgTableOptions,
  extraConfig?: (
    self: BuildColumns<
      TTableName,
      TColumnsMap & ReturnType<typeof orgIdColumns>,
      "pg"
    >,
  ) => PgTableExtraConfig,
) {
  return pgTable(
    name,
    {
      ...orgIdColumns(options.generateDefaultId),
      ...(options.includeTimestamps ? timestamps : {}),
      ...columns,
    },
    (table) => ({
      primary: primaryKey({ columns: [table.id, table.orgId] }),
      ...extraConfig,
    }),
  );
}
