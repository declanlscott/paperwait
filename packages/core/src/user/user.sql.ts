import { pgEnum, text } from "drizzle-orm/pg-core";

import { orgTable, timestamps } from "../utils";

export const userRole = pgEnum("user_role", [
  "administrator",
  "technician",
  "manager",
  "customer",
]);
export type UserRole = (typeof userRole.enumValues)[number];

export const User = orgTable("user", {
  providerId: text("provider_id").notNull().unique(),
  role: userRole("role").notNull().default("customer"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  ...timestamps,
});
export type User = typeof User.$inferSelect;
