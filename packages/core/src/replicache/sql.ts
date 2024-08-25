import {
  bigint,
  foreignKey,
  index,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { id, timestamps } from "../drizzle/columns";
import { orgIdColumns } from "../drizzle/tables";
import { users } from "../user/sql";

import type { ClientViewRecord } from "./client-view-record";

export const ReplicacheMeta = pgTable("replicache_meta", {
  key: text("key").primaryKey(),
  value: json("value").notNull(),
});

export const replicacheClientGroups = pgTable(
  "replicache_client_groups",
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
      foreignColumns: [users.id, users.orgId],
      name: "user_fk",
    }),
  }),
);
export type ReplicacheClientGroup = typeof replicacheClientGroups.$inferSelect;

export const replicacheClients = pgTable(
  "replicache_clients",
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
      foreignColumns: [replicacheClientGroups.id, replicacheClientGroups.orgId],
      name: "client_group_fk",
    }),
    clientGroupIdIndex: index("client_group_id_idx").on(table.clientGroupId),
  }),
);
export type ReplicacheClient = typeof replicacheClients.$inferSelect;

export const replicacheClientViews = pgTable(
  "replicache_client_views",
  {
    orgId: orgIdColumns.orgId,
    clientGroupId: uuid("client_group_id").notNull(),
    version: integer("version").notNull(),
    record: json("record").$type<ClientViewRecord>().notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({
      columns: [table.clientGroupId, table.version, table.orgId],
    }),
    clientGroupReference: foreignKey({
      columns: [table.clientGroupId, table.orgId],
      foreignColumns: [replicacheClientGroups.id, replicacheClientGroups.orgId],
      name: "client_group_fk",
    }),
  }),
);
export type ReplicacheClientView = typeof replicacheClientViews.$inferSelect;
