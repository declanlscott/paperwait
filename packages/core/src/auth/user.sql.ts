import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";

import { Organization } from "../organization/organization.sql";
import { id, timestamps } from "../utils/drizzle";
import { generateId } from "../utils/nanoid";

export const userRole = pgEnum("user_role", [
  "administrator",
  "technician",
  "manager",
  "customer",
]);
export type UserRole = (typeof userRole.enumValues)[number];

export const User = pgTable("user", {
  id: id("id").$defaultFn(generateId).primaryKey(),
  providerId: text("provider_id").notNull().unique(),
  orgId: id("org_id")
    .notNull()
    .references(() => Organization.id),
  role: userRole("role").notNull().default("customer"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  ...timestamps,
});
