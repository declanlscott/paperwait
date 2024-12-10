import { sql } from "drizzle-orm";
import { bigint, index, numeric, text, uniqueIndex } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { tenantTable } from "../drizzle/tables";
import { billingAccountType } from "../utils/sql";
import {
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
  billingAccountsTableName,
} from "./shared";

import type { InferSelectModel } from "drizzle-orm";

export const billingAccountsTable = tenantTable(
  billingAccountsTableName,
  {
    type: billingAccountType("type").notNull(),
    name: text("name").notNull(),
    reviewThreshold: numeric("review_threshold"),
    papercutAccountId: bigint({ mode: "number" }),
  },
  (table) => [
    uniqueIndex("unique_papercut_account_id")
      .on(table.papercutAccountId, table.tenantId)
      .where(sql`${table.papercutAccountId} IS NOT NULL`),
  ],
);
export type BillingAccountsTable = typeof billingAccountsTable;
export type BillingAccount = InferSelectModel<BillingAccountsTable>;

export const billingAccountCustomerAuthorizationsTable = tenantTable(
  billingAccountCustomerAuthorizationsTableName,
  {
    customerId: id("customer_id").notNull(),
    billingAccountId: id("billing_account_id").notNull(),
  },
  (table) => [
    uniqueIndex("unique_billing_account_customer_idx").on(
      table.billingAccountId,
      table.customerId,
    ),
    index("customer_id_idx").on(table.customerId),
  ],
);
export type BillingAccountCustomerAuthorizationsTable =
  typeof billingAccountCustomerAuthorizationsTable;
export type BillingAccountCustomerAuthorization =
  InferSelectModel<BillingAccountCustomerAuthorizationsTable>;

export const billingAccountManagerAuthorizationsTable = tenantTable(
  billingAccountManagerAuthorizationsTableName,
  {
    managerId: id("manager_id").notNull(),
    billingAccountId: id("billing_account_id").notNull(),
  },
  (table) => [
    uniqueIndex("unique_billing_account_manager_idx").on(
      table.billingAccountId,
      table.managerId,
    ),
    index("manager_id_idx").on(table.managerId),
  ],
);
export type BillingAccountManagerAuthorizationsTable =
  typeof billingAccountManagerAuthorizationsTable;
export type BillingAccountManagerAuthorization =
  InferSelectModel<BillingAccountManagerAuthorizationsTable>;
