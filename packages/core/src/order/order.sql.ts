import { foreignKey } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { User } from "../user/user.sql";

export const Order = orgTable(
  "order",
  { customerId: id("customer_id").notNull() },
  (table) => ({
    customerReference: foreignKey({
      columns: [table.customerId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "customer_fk",
    }),
  }),
);
export type Order = typeof Order.$inferSelect;
