import {
  bigint,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { id, timestamps } from "../drizzle/columns";
import { tenantIdColumns } from "../drizzle/tables";
import { usersTable } from "../users/sql";
import {
  replicacheClientGroupsTableName,
  replicacheClientsTableName,
  replicacheClientViewsTableName,
  replicacheMetaTableName,
} from "./shared";

import type { InferSelectModel } from "drizzle-orm";
import type { ClientViewRecord } from "./client-view-record";

export const replicacheMetaTable = pgTable(replicacheMetaTableName, {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});
export type ReplicacheMetaTable = typeof replicacheMetaTable;
export type ReplicacheMeta = InferSelectModel<ReplicacheMetaTable>;

export const replicacheClientGroupsTable = pgTable(
  replicacheClientGroupsTableName,
  {
    id: uuid("id").notNull(),
    tenantId: tenantIdColumns.tenantId,
    userId: id("user_id").notNull(),
    cvrVersion: integer("cvr_version").notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.tenantId] }),
    userReference: foreignKey({
      columns: [table.userId, table.tenantId],
      foreignColumns: [usersTable.id, usersTable.tenantId],
      name: "user_fk",
    }).onDelete("cascade"),
    updatedAtIndex: index("updated_at_idx").on(table.updatedAt),
  }),
);
export type ReplicacheClientGroupsTable = typeof replicacheClientGroupsTable;
export type ReplicacheClientGroup =
  InferSelectModel<ReplicacheClientGroupsTable>;

export const replicacheClientsTable = pgTable(
  replicacheClientsTableName,
  {
    id: uuid("id").notNull(),
    tenantId: tenantIdColumns.tenantId,
    clientGroupId: uuid("client_group_id").notNull(),
    lastMutationId: bigint("last_mutation_id", { mode: "number" })
      .notNull()
      .default(0),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.tenantId] }),
    clientGroupReference: foreignKey({
      columns: [table.clientGroupId, table.tenantId],
      foreignColumns: [
        replicacheClientGroupsTable.id,
        replicacheClientGroupsTable.tenantId,
      ],
      name: "client_group_fk",
    }).onDelete("cascade"),
    clientGroupIdIndex: index("client_group_id_idx").on(table.clientGroupId),
    updatedAtIndex: index("updated_at_idx").on(table.updatedAt),
  }),
);
export type ReplicacheClientsTable = typeof replicacheClientsTable;
export type ReplicacheClient = InferSelectModel<ReplicacheClientsTable>;

export const replicacheClientViewsTable = pgTable(
  replicacheClientViewsTableName,
  {
    tenantId: tenantIdColumns.tenantId,
    clientGroupId: uuid("client_group_id").notNull(),
    version: integer("version").notNull(),
    record: jsonb("record").$type<ClientViewRecord>().notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({
      columns: [table.clientGroupId, table.version, table.tenantId],
    }),
    clientGroupReference: foreignKey({
      columns: [table.clientGroupId, table.tenantId],
      foreignColumns: [
        replicacheClientGroupsTable.id,
        replicacheClientGroupsTable.tenantId,
      ],
      name: "client_group_fk",
    }).onDelete("cascade"),
    updatedAtIndex: index("updated_at_idx").on(table.updatedAt),
  }),
);
export type ReplicacheClientViewsTable = typeof replicacheClientViewsTable;
export type ReplicacheClientView = InferSelectModel<ReplicacheClientViewsTable>;
