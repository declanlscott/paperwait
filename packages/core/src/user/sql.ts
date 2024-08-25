import { index, text } from "drizzle-orm/pg-core";

import { userRole } from "../drizzle/enums";
import { orgTable } from "../drizzle/tables";

export const users = orgTable(
  "users",
  {
    providerId: text("provider_id").notNull().unique(),
    role: userRole("role").notNull().default("customer"),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    username: text("username").notNull(),
  },
  (table) => ({
    providerIdIndex: index("provider_id_idx").on(table.providerId),
    roleIndex: index("role_idx").on(table.role),
  }),
);

export type User = typeof users.$inferSelect;
