import { pgTable, timestamp } from "drizzle-orm/pg-core";

import { id } from "../utils/drizzle";
import { User } from "./user.sql";

export const Session = pgTable("session", {
  id: id("id").primaryKey(),
  userId: id("user_id")
    .notNull()
    .references(() => User.id),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});
