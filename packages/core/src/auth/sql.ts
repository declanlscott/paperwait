import { foreignKey, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { tenantIdColumns } from "../drizzle/tables";
import { usersTable } from "../users/sql";

import type { InferSelectModel } from "drizzle-orm";

export const sessionsTable = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    tenantId: tenantIdColumns.tenantId,
    userId: id("user_id").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    userReference: foreignKey({
      columns: [table.userId, table.tenantId],
      foreignColumns: [usersTable.id, usersTable.tenantId],
      name: "user_fk",
    }).onDelete("cascade"),
  }),
);
export type SessionsTable = typeof sessionsTable;
export type Session = InferSelectModel<SessionsTable>;

export const sessionTokensTable = pgTable("session_tokens", {
  sessionId: text("session_id")
    .primaryKey()
    .references(() => sessionsTable.id, { onDelete: "cascade" }),
  userId: id("user_id").notNull(),
  tenantId: tenantIdColumns.tenantId,
  idToken: text("id_token").notNull(),
  accessToken: text("access_token").notNull(),
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshToken: text("refresh_token"),
});
export type SessionTokensTable = typeof sessionTokensTable;
export type SessionTokens = InferSelectModel<SessionTokensTable>;
