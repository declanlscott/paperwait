import { foreignKey, timestamp } from "drizzle-orm/pg-core";

import { orgTable } from "../drizzle";
import { id } from "../drizzle/columns";
import { User } from "../user/user.sql";

export const Session = orgTable(
  "session",
  {
    userId: id("user_id").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  {
    generateDefaultId: false,
    includeTimestamps: false,
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
