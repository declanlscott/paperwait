import { foreignKey, text } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { SharedAccount } from "../shared-account";
import { User } from "../user/user.sql";

export const Order = orgTable(
  "order",
  {
    customerId: id("customer_id").notNull(),
    sharedAccountId: id("shared_account_id").notNull(),
    status: text("status").notNull(),
  },
  (table) => ({
    customerReference: foreignKey({
      columns: [table.customerId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "customer_fk",
    }),
    sharedAccountReference: foreignKey({
      columns: [table.sharedAccountId, table.orgId],
      foreignColumns: [SharedAccount.id, SharedAccount.orgId],
      name: "shared_account_fk",
    }),
  }),
);
export type Order = typeof Order.$inferSelect;
