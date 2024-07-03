import { getTableColumns, sql } from "drizzle-orm";
import { char, timestamp } from "drizzle-orm/pg-core";

import { NANOID_LENGTH } from "../constants";
import { generateId } from "../schemas/id";

import type { SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

/**
 * NanoID column
 */
export function id(name: string) {
  return char(name, { length: NANOID_LENGTH });
}

/**
 * Primary key nanoID column
 */
export const idPrimaryKey = {
  get id() {
    return id("id").$default(generateId).primaryKey();
  },
};

/**
 * Timestamps columns
 */
export const timestamps = {
  get createdAt() {
    return timestamp("created_at", { mode: "string" }).notNull().defaultNow();
  },
  get updatedAt() {
    return timestamp("updated_at", { mode: "string" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`);
  },
  get deletedAt() {
    return timestamp("deleted_at", { mode: "string" });
  },
};
export type Timestamp = keyof typeof timestamps;

export function buildConflictUpdateColumns<
  TTable extends PgTable,
  TColumnName extends keyof TTable["_"]["columns"],
>(table: TTable, columnNames: Array<TColumnName>) {
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
