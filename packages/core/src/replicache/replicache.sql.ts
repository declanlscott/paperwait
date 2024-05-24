import {
  bigint,
  foreignKey,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";

import { id, timestamps } from "../drizzle/columns";
import { orgIdColumns, orgTable } from "../drizzle/tables";
import { User } from "../user/user.sql";

import type { ClientViewRecord } from "./client-view-record";

export const ReplicacheMeta = pgTable("replicache_meta", {
  key: text("key").primaryKey(),
  value: json("value").notNull(),
});

export const ReplicacheClientGroup = orgTable(
  "replicache_client_group",
  {
    userId: id("user_id").notNull(),
    cvrVersion: integer("cvr_version").notNull(),
  },
  // defaultOrgTableOptions,
  (table) => ({
    userReference: foreignKey({
      columns: [table.userId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "user_fk",
    }),
  }),
);
export type ReplicacheClientGroup = typeof ReplicacheClientGroup.$inferSelect;

export const ReplicacheClient = orgTable(
  "replicache_client",
  {
    clientGroupId: id("client_group_id").notNull(),
    lastMutationId: bigint("last_mutation_id", { mode: "number" })
      .notNull()
      .default(0),
  },
  // defaultOrgTableOptions,
  (table) => ({
    clientGroupReference: foreignKey({
      columns: [table.clientGroupId, table.orgId],
      foreignColumns: [ReplicacheClientGroup.id, ReplicacheClientGroup.orgId],
      name: "client_group_fk",
    }),
  }),
);
export type ReplicacheClient = typeof ReplicacheClient.$inferSelect;

export const ReplicacheClientView = pgTable(
  "replicache_client_view",
  {
    orgId: orgIdColumns.orgId,
    clientGroupId: id("client_group_id").notNull(),
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
      foreignColumns: [ReplicacheClientGroup.id, ReplicacheClientGroup.orgId],
      name: "client_group_fk",
    }),
  }),
);
export type ReplicacheClientView = typeof ReplicacheClientView.$inferSelect;
