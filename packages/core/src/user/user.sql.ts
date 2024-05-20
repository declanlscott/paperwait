import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";

import { Organization } from "../organization";
import { id, idPrimaryKey, timestamps } from "../utils";

export const UserRole = pgEnum("user_role", [
  "administrator",
  "technician",
  "manager",
  "customer",
]);
export type UserRole = (typeof UserRole.enumValues)[number];

export const User = pgTable("user", {
  ...idPrimaryKey,
  orgId: id("org_id")
    .notNull()
    .references(() => Organization.id),
  providerId: text("provider_id").notNull().unique(),
  role: UserRole("role").notNull().default("customer"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  ...timestamps,
});
export type User = typeof User.$inferSelect;
