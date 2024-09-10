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
import { orgIdColumns } from "../drizzle/tables";
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
    orgId: orgIdColumns.orgId,
    userId: id("user_id").notNull(),
    cvrVersion: integer("cvr_version").notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.orgId] }),
    userReference: foreignKey({
      columns: [table.userId, table.orgId],
      foreignColumns: [usersTable.id, usersTable.orgId],
      name: "user_fk",
    }),
  }),
);
export type ReplicacheClientGroupsTable = typeof replicacheClientGroupsTable;
export type ReplicacheClientGroup =
  InferSelectModel<ReplicacheClientGroupsTable>;

export const replicacheClientsTable = pgTable(
  replicacheClientsTableName,
  {
    id: uuid("id").notNull(),
    orgId: orgIdColumns.orgId,
    clientGroupId: uuid("client_group_id").notNull(),
    lastMutationId: bigint("last_mutation_id", { mode: "number" })
      .notNull()
      .default(0),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.orgId] }),
    clientGroupReference: foreignKey({
      columns: [table.clientGroupId, table.orgId],
      foreignColumns: [
        replicacheClientGroupsTable.id,
        replicacheClientGroupsTable.orgId,
      ],
      name: "client_group_fk",
    }),
    clientGroupIdIndex: index("client_group_id_idx").on(table.clientGroupId),
  }),
);
export type ReplicacheClientsTable = typeof replicacheClientsTable;
export type ReplicacheClient = InferSelectModel<ReplicacheClientsTable>;

export const replicacheClientViewsTable = pgTable(
  replicacheClientViewsTableName,
  {
    orgId: orgIdColumns.orgId,
    clientGroupId: uuid("client_group_id").notNull(),
    version: integer("version").notNull(),
    record: jsonb("record").$type<ClientViewRecord>().notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({
      columns: [table.clientGroupId, table.version, table.orgId],
    }),
    clientGroupReference: foreignKey({
      columns: [table.clientGroupId, table.orgId],
      foreignColumns: [
        replicacheClientGroupsTable.id,
        replicacheClientGroupsTable.orgId,
      ],
      name: "client_group_fk",
    }),
  }),
);
export type ReplicacheClientViewsTable = typeof replicacheClientViewsTable;
export type ReplicacheClientView = InferSelectModel<ReplicacheClientViewsTable>;
