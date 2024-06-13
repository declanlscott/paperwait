import { foreignKey, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import * as v from "valibot";

import { orgIdColumns } from "../drizzle";
import { id } from "../drizzle/columns";
import { NanoId } from "../id";
import { User } from "../user/user.sql";

export const Session = pgTable(
  "session",
  {
    id: id("id").primaryKey(),
    orgId: orgIdColumns.orgId,
    userId: id("user_id").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
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

export const SessionTokens = pgTable("session_tokens", {
  sessionId: id("session_id")
    .primaryKey()
    .references(() => Session.id, { onDelete: "cascade" }),
  userId: id("user_id").notNull(),
  orgId: orgIdColumns.orgId,
  idToken: text("id_token").notNull(),
  accessToken: text("access_token").notNull(),
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshToken: text("refresh_token"),
});
export type SessionTokens = typeof SessionTokens.$inferSelect;

export const SessionTokensSchema = v.object({
  sessionId: NanoId,
  userId: NanoId,
  orgId: NanoId,
  idToken: v.string(),
  accessToken: v.string(),
  accessTokenExpiresAt: v.date(),
  refreshToken: v.nullable(v.string()),
});
