import { pgTable, timestamp } from "drizzle-orm/pg-core";

import { User } from "../user/user.sql";
import { id } from "../utils";

export const Session = pgTable("session", {
  id: id("id").primaryKey(),
  userId: id("user_id")
    .notNull()
    .references(() => User.id),
  expiresAt: timestamp("expires_at").notNull(),
});
export type Session = typeof Session.$inferSelect;
