import {
  foreignKey,
  index,
  jsonb,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { billingAccountsTable } from "../billing-accounts/sql";
import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { productsTable } from "../products/sql";
import { deliveryOptionsTable, workflowStatusesTable } from "../rooms/sql";
import { usersTable } from "../users/sql";
import { Constants } from "../utils/constants";
import { ordersTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";
import type { OrderAttributes } from "./shared";

export const ordersTable = tenantTable(
  ordersTableName,
  {
    customerId: id("customer_id").notNull(),
    managerId: id("manager_id"),
    operatorId: id("operator_id"),
    productId: id("product_id").notNull(),
    billingAccountId: id("billing_account_id").notNull(),
    attributes: jsonb("attributes").$type<OrderAttributes>().notNull(),
    workflowStatus: varchar("workflow_status", {
      length: Constants.VARCHAR_LENGTH,
    }).notNull(),
    deliverTo: varchar("deliver_to", {
      length: Constants.VARCHAR_LENGTH,
    }).notNull(),
    approvedAt: timestamp("approved_at"),
  },
  (table) => ({
    customerReference: foreignKey({
      columns: [table.customerId, table.tenantId],
      foreignColumns: [usersTable.id, usersTable.tenantId],
      name: "customer_fk",
    }),
    managerId: foreignKey({
      columns: [table.managerId, table.tenantId],
      foreignColumns: [usersTable.id, usersTable.tenantId],
      name: "manager_fk",
    }),
    operatorId: foreignKey({
      columns: [table.operatorId, table.tenantId],
      foreignColumns: [usersTable.id, usersTable.tenantId],
      name: "operator_fk",
    }),
    productReference: foreignKey({
      columns: [table.productId, table.tenantId],
      foreignColumns: [productsTable.id, productsTable.tenantId],
      name: "product_fk",
    }),
    billingAccountReference: foreignKey({
      columns: [table.billingAccountId, table.tenantId],
      foreignColumns: [billingAccountsTable.id, billingAccountsTable.tenantId],
      name: "billing_account_fk",
    }),
    workflowStatusReference: foreignKey({
      columns: [table.workflowStatus, table.tenantId],
      foreignColumns: [
        workflowStatusesTable.id,
        workflowStatusesTable.tenantId,
      ],
      name: "workflow_status_fk",
    }),
    deliverToReference: foreignKey({
      columns: [table.deliverTo, table.tenantId],
      foreignColumns: [deliveryOptionsTable.id, deliveryOptionsTable.tenantId],
      name: "deliver_to_fk",
    }),
    customerIdIndex: index("customer_id_idx").on(table.customerId),
    billingAccountIdIndex: index("billing_account_id_idx").on(
      table.billingAccountId,
    ),
  }),
);

export type OrdersTable = typeof ordersTable;

export type Order = InferSelectModel<OrdersTable>;
