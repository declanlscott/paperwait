import { foreignKey, index } from "drizzle-orm/pg-core";

import { bigintString, id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { papercutAccounts } from "../papercut/sql";
import { products } from "../product/sql";
import { users } from "../user/sql";

export const orders = orgTable(
  "orders",
  {
    customerId: id("customer_id").notNull(),
    managerId: id("manager_id"),
    operatorId: id("operator_id"),
    productId: id("product_id").notNull(),
    papercutAccountId: bigintString("papercut_account_id").notNull(),
  },
  (table) => ({
    customerReference: foreignKey({
      columns: [table.customerId, table.orgId],
      foreignColumns: [users.id, users.orgId],
      name: "customer_fk",
    }),
    managerId: foreignKey({
      columns: [table.managerId, table.orgId],
      foreignColumns: [users.id, users.orgId],
      name: "manager_fk",
    }),
    operatorId: foreignKey({
      columns: [table.operatorId, table.orgId],
      foreignColumns: [users.id, users.orgId],
      name: "operator_fk",
    }),
    productReference: foreignKey({
      columns: [table.productId, table.orgId],
      foreignColumns: [products.id, products.orgId],
      name: "product_fk",
    }),
    papercutAccountReference: foreignKey({
      columns: [table.papercutAccountId, table.orgId],
      foreignColumns: [papercutAccounts.id, papercutAccounts.orgId],
      name: "papercut_account_fk",
    }),
    customerIdIndex: index("customer_id_idx").on(table.customerId),
    papercutAccountIdIndex: index("papercut_account_id_idx").on(
      table.papercutAccountId,
    ),
  }),
);

export type Order = typeof orders.$inferSelect;
