import { index, text, unique } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { userRole } from "../utils/sql";
import { userProfilesTableName, usersTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";

export const usersTable = tenantTable(
  usersTableName,
  { username: text("username").notNull() },
  (table) => [
    unique("unique_username").on(table.username, table.tenantId),
    index("username_idx").on(table.username),
  ],
);

export type UsersTable = typeof usersTable;

export type User = InferSelectModel<UsersTable>;

export const userProfilesTable = tenantTable(
  userProfilesTableName,
  {
    userId: id("user_id").notNull(),
    oauth2UserId: text("oauth2_user_id").notNull(),
    role: userRole("role").notNull().default("customer"),
    name: text("name").notNull(),
    email: text("email").notNull(),
  },
  (table) => [
    unique("unique_user_id").on(table.userId, table.tenantId),
    unique("unique_oauth2_user_id").on(table.oauth2UserId, table.tenantId),
    unique("unique_email").on(table.email, table.tenantId),
    index("oauth2_user_id_idx").on(table.oauth2UserId),
    index("role_idx").on(table.role),
  ],
);

export type UserProfilesTable = typeof userProfilesTable;

export type UserProfile = InferSelectModel<UserProfilesTable>;

export interface UserWithProfile extends User {
  profile: UserProfile;
}
