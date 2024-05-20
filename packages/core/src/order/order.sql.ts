import { pgTable } from "drizzle-orm/pg-core";

import { Organization } from "../organization";
import { User } from "../user";
import { id, idPrimaryKey, timestamps } from "../utils";

export const Order = pgTable("order", {
  ...idPrimaryKey,
  orgId: id("org_id")
    .notNull()
    .references(() => Organization.id),
  customerId: id("customer_id")
    .notNull()
    .references(() => User.id),
  ...timestamps,
});
export type Order = typeof Order.$inferSelect;
