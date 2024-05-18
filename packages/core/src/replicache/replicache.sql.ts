import {
  bigint,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";

import { User } from "../user";
import { id, idPrimaryKey, timestamps } from "../utils";

import type { ClientViewRecord } from "./client-view-record";

export const ReplicacheMeta = pgTable("replicache_meta", {
  key: text("key").primaryKey(),
  value: json("value").notNull(),
});

export const ReplicacheClientGroup = pgTable("replicache_client_group", {
  ...idPrimaryKey,
  userId: id("user_id")
    .notNull()
    .references(() => User.id),
  cvrVersion: integer("cvr_version").notNull(),
  ...timestamps,
});
export type ReplicacheClientGroup = typeof ReplicacheClientGroup.$inferSelect;

export const ReplicacheClient = pgTable("replicache_client", {
  ...idPrimaryKey,
  clientGroupId: id("client_group_id")
    .notNull()
    .references(() => ReplicacheClientGroup.id),
  lastMutationId: bigint("last_mutation_id", { mode: "number" })
    .notNull()
    .default(0),
  ...timestamps,
});
export type ReplicacheClient = typeof ReplicacheClient.$inferSelect;

export const ReplicacheClientView = pgTable(
  "replicache_client_view",
  {
    clientGroupId: id("client_group_id")
      .notNull()
      .references(() => ReplicacheClientGroup.id),
    version: integer("version").notNull(),
    record: json("record").$type<ClientViewRecord>().notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.clientGroupId, table.version] }),
  }),
);
export type ReplicacheClientView = typeof ReplicacheClientView.$inferSelect;
