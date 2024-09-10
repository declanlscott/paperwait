import { index, text, unique } from "drizzle-orm/pg-core";

import { userRole } from "../drizzle/enums.sql";
import { orgTable } from "../drizzle/tables";
import { usersTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";

export const usersTable = orgTable(
  usersTableName,
  {
    oauth2UserId: text("oauth2_user_id").notNull(),
    role: userRole("role").notNull().default("customer"),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    username: text("username").notNull(),
  },
  (table) => ({
    uniqueOauth2UserId: unique("unique_oauth2_user_id").on(
      table.oauth2UserId,
      table.orgId,
    ),
    uniqueEmail: unique("unique_email").on(table.email, table.orgId),
    oauth2UserIdIndex: index("oauth2_user_id_idx").on(table.oauth2UserId),
    roleIndex: index("role_idx").on(table.role),
  }),
);

export type UsersTable = typeof usersTable;

export type User = InferSelectModel<UsersTable>;
