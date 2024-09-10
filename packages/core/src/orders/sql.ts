import { foreignKey, index } from "drizzle-orm/pg-core";

import { bigintString, id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { papercutAccountsTable } from "../papercut/sql";
import { productsTable } from "../products/sql";
import { usersTable } from "../users/sql";
import { ordersTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";

export const ordersTable = orgTable(
  ordersTableName,
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
      foreignColumns: [usersTable.id, usersTable.orgId],
      name: "customer_fk",
    }),
    managerId: foreignKey({
      columns: [table.managerId, table.orgId],
      foreignColumns: [usersTable.id, usersTable.orgId],
      name: "manager_fk",
    }),
    operatorId: foreignKey({
      columns: [table.operatorId, table.orgId],
      foreignColumns: [usersTable.id, usersTable.orgId],
      name: "operator_fk",
    }),
    productReference: foreignKey({
      columns: [table.productId, table.orgId],
      foreignColumns: [productsTable.id, productsTable.orgId],
      name: "product_fk",
    }),
    papercutAccountReference: foreignKey({
      columns: [table.papercutAccountId, table.orgId],
      foreignColumns: [papercutAccountsTable.id, papercutAccountsTable.orgId],
      name: "papercut_account_fk",
    }),
    customerIdIndex: index("customer_id_idx").on(table.customerId),
    papercutAccountIdIndex: index("papercut_account_id_idx").on(
      table.papercutAccountId,
    ),
  }),
);

export type OrdersTable = typeof ordersTable;

export type Order = InferSelectModel<OrdersTable>;
