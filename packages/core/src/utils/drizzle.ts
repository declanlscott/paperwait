import { sql } from "drizzle-orm";
import { char, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";

import { generateId } from ".";
import { COMPOSITE_KEY_DELIMITER, NANOID_LENGTH } from "../constants";
import { Organization } from "../organization";

import type { BuildColumns } from "drizzle-orm";
import type {
  PgColumnBuilderBase,
  PgTableExtraConfig,
} from "drizzle-orm/pg-core";

/**
 * NanoID column
 */
export function id(name: string) {
  return char(name, { length: NANOID_LENGTH });
}

/**
 * Default primary key column
 */
export const idPrimaryKey = {
  get id() {
    return id("id").$defaultFn(generateId).primaryKey();
  },
};

/**
 * IDs for organization owned tables (used as composite primary key)
 */
export const orgId = {
  get id() {
    return id("id").notNull();
  },
  get orgId() {
    return id("org_id")
      .notNull()
      .references(() => Organization.id);
  },
};

/**
 * Wrapper for organization owned tables
 */
export const orgTable = <
  TTableName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
>(
  name: TTableName,
  columns: TColumnsMap,
  extraConfig?: (
    self: BuildColumns<TTableName, TColumnsMap & typeof orgId, "pg">,
  ) => PgTableExtraConfig,
) =>
  pgTable(name, { ...columns, ...orgId }, (table) => ({
    primary: primaryKey({ columns: [table.id, table.orgId] }),
    ...extraConfig,
  }));

/**
 * Join composite key with delimiter
 */
export function buildCompositeKey(...values: Array<string | number>) {
  return values.join(COMPOSITE_KEY_DELIMITER);
}

/**
 * Timestamps columns
 */
export const timestamps = {
  get createdAt() {
    return timestamp("created_at").notNull().defaultNow();
  },
  get updatedAt() {
    return timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`);
  },
  get deletedAt() {
    return timestamp("deleted_at");
  },
};
export type Timestamp = keyof typeof timestamps;

export type OmitTimestamps<TTable> = Omit<TTable, keyof typeof timestamps>;

export type SerializedEntity<TEntity> = Omit<TEntity, Timestamp> & {
  [TimestampKey in Timestamp]: (typeof timestamps)[TimestampKey]["_"]["notNull"] extends true
    ? string
    : string | null;
};

export function serializeEntity<TEntity extends Record<string, unknown>>(
  entity: TEntity,
) {
  return Object.entries(entity).reduce((serializedEntity, [key, value]) => {
    if (value instanceof Date) {
      return { ...serializedEntity, [key]: value.toISOString() };
    }

    if (value instanceof Object) {
      return { ...serializedEntity, [key]: JSON.stringify(value) };
    }

    return { ...serializedEntity, [key]: value };
  }, {} as SerializedEntity<TEntity>);
}
