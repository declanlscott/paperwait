import {
  bigint,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";

import { User } from "../user";
import { generateId, id, timestamps } from "../utils";

export const ReplicacheMeta = pgTable("replicache_meta", {
  key: text("key").primaryKey(),
  value: json("value").notNull(),
});

export const ReplicacheClientGroup = pgTable("replicache_client_group", {
  id: id("id").$defaultFn(generateId).primaryKey(),
  userId: id("user_id")
    .notNull()
    .references(() => User.id),
  cvrVersion: integer("cvr_version").notNull(),
  ...timestamps,
});

export const ReplicacheClient = pgTable("replicache_client", {
  id: id("id").$defaultFn(generateId).primaryKey(),
  clientGroupId: id("client_group_id")
    .notNull()
    .references(() => ReplicacheClientGroup.id),
  mutationId: bigint("mutation_id", { mode: "number" }).notNull(),
  ...timestamps,
});

export const ReplicacheClientViewRecord = pgTable(
  "replicache_cvr",
  {
    id: integer("id").notNull(),
    clientGroupId: id("client_group_id")
      .notNull()
      .references(() => ReplicacheClientGroup.id),
    data: json("data").$type<Record<string, number>>().notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.clientGroupId] }),
  }),
);
