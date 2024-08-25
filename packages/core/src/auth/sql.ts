import { foreignKey, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { orgIdColumns } from "../drizzle/tables";
import { users } from "../user/sql";

export const sessions = pgTable(
  "sessions",
  {
    id: id("id").primaryKey(),
    orgId: orgIdColumns.orgId,
    userId: id("user_id").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    userReference: foreignKey({
      columns: [table.userId, table.orgId],
      foreignColumns: [users.id, users.orgId],
      name: "user_fk",
    }),
  }),
);
export type Session = typeof sessions.$inferSelect;

export const sessionsTokens = pgTable("session_tokens", {
  sessionId: id("session_id")
    .primaryKey()
    .references(() => sessions.id, { onDelete: "cascade" }),
  userId: id("user_id").notNull(),
  orgId: orgIdColumns.orgId,
  idToken: text("id_token").notNull(),
  accessToken: text("access_token").notNull(),
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshToken: text("refresh_token"),
});
export type SessionsTokens = typeof sessionsTokens.$inferSelect;
