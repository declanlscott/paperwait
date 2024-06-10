import {
  foreignKey,
  pgTable,
  primaryKey,
  timestamp,
} from "drizzle-orm/pg-core";
import * as v from "valibot";

import { orgIdColumns } from "../drizzle";
import { id } from "../drizzle/columns";
import { NanoId } from "../id";
import { User } from "../user/user.sql";

export const Session = pgTable(
  "session",
  {
    id: id("id").notNull(),
    orgId: orgIdColumns.orgId,
    userId: id("user_id").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.orgId] }),
    userReference: foreignKey({
      columns: [table.userId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "user_fk",
    }),
  }),
);
export type Session = typeof Session.$inferSelect;

export const SessionSchema = v.object({
  id: NanoId,
  orgId: NanoId,
  userId: NanoId,
  expiresAt: v.date(),
});
