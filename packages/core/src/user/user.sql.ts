import { index, pgEnum, text } from "drizzle-orm/pg-core";

import { orgTable } from "../orm/tables";

export const UserRole = pgEnum("user_role", [
  "administrator",
  "operator",
  "manager",
  "customer",
]);
export type UserRole = (typeof UserRole.enumValues)[number];

export const User = orgTable(
  "user",
  {
    providerId: text("provider_id").notNull().unique(),
    role: UserRole("role").notNull().default("customer"),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    username: text("username").notNull(),
  },
  (table) => ({
    providerIdIndex: index("provider_id_idx").on(table.providerId),
    roleIndex: index("role_idx").on(table.role),
  }),
);
export type User = typeof User.$inferSelect;
