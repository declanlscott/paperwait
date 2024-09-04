import { index, text, unique } from "drizzle-orm/pg-core";

import { userRole } from "../drizzle/enums.sql";
import { orgTable } from "../drizzle/tables";
import { usersTableName } from "./shared";

export const users = orgTable(
  usersTableName,
  {
    oAuth2UserId: text("oauth2_user_id").notNull(),
    role: userRole("role").notNull().default("customer"),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    username: text("username").notNull(),
  },
  (table) => ({
    uniqueOAuth2UserId: unique("unique_oauth2_user_id").on(
      table.oAuth2UserId,
      table.orgId,
    ),
    uniqueEmail: unique("unique_email").on(table.email, table.orgId),
    oAuth2UserIdIndex: index("oauth2_user_id_idx").on(table.oAuth2UserId),
    roleIndex: index("role_idx").on(table.role),
  }),
);

export type User = typeof users.$inferSelect;
