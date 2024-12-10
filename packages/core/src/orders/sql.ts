import { index, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
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
  (table) => [
    index("customer_id_idx").on(table.customerId),
    index("billing_account_id_idx").on(table.billingAccountId),
  ],
);

export type OrdersTable = typeof ordersTable;

export type Order = InferSelectModel<OrdersTable>;
