import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  unique,
} from "drizzle-orm/pg-core";

import { bigintString, id, timestamps } from "../drizzle/columns";
import { orgIdColumns, orgTable } from "../drizzle/tables";
import { usersTable } from "../users/sql";
import {
  papercutAccountCustomerAuthorizationsTableName,
  papercutAccountManagerAuthorizationsTableName,
  papercutAccountsTableName,
} from "./shared";

import type { InferSelectModel } from "drizzle-orm";

export const papercutAccountsTable = pgTable(
  papercutAccountsTableName,
  {
    id: bigintString("id").notNull(),
    orgId: orgIdColumns.orgId,
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.orgId] }),
    uniqueName: unique("unique_name").on(table.name, table.orgId),
  }),
);
export type PapercutAccountsTable = typeof papercutAccountsTable;
export type PapercutAccount = InferSelectModel<PapercutAccountsTable>;

export const papercutAccountCustomerAuthorizationsTable = orgTable(
  papercutAccountCustomerAuthorizationsTableName,
  {
    customerId: id("customer_id").notNull(),
    papercutAccountId: bigintString("papercut_account_id").notNull(),
  },
  (table) => ({
    customerReference: foreignKey({
      columns: [table.customerId, table.orgId],
      foreignColumns: [usersTable.id, usersTable.orgId],
      name: "user_fk",
    }),
    papercutAccountReference: foreignKey({
      columns: [table.papercutAccountId, table.orgId],
      foreignColumns: [papercutAccountsTable.id, papercutAccountsTable.orgId],
      name: "papercut_account_fk",
    }),
    uniquePapercutAccountCustomer: unique(
      "unique_papercut_account_customer",
    ).on(table.papercutAccountId, table.customerId),
    customerIdIndex: index("customer_id_idx").on(table.customerId),
    papercutAccountIdIndex: index("papercut_account_id_idx").on(
      table.papercutAccountId,
    ),
  }),
);
export type PapercutAccountCustomerAuthorizationsTable =
  typeof papercutAccountCustomerAuthorizationsTable;
export type PapercutAccountCustomerAuthorization =
  InferSelectModel<PapercutAccountCustomerAuthorizationsTable>;

export const papercutAccountManagerAuthorizationsTable = orgTable(
  papercutAccountManagerAuthorizationsTableName,
  {
    managerId: id("manager_id").notNull(),
    papercutAccountId: bigintString("papercut_account_id").notNull(),
  },
  (table) => ({
    managerReference: foreignKey({
      columns: [table.managerId, table.orgId],
      foreignColumns: [usersTable.id, usersTable.orgId],
      name: "manager_fk",
    }),
    papercutAccountReference: foreignKey({
      columns: [table.papercutAccountId, table.orgId],
      foreignColumns: [papercutAccountsTable.id, papercutAccountsTable.orgId],
      name: "papercut_account_fk",
    }),
    uniquePapercutAccountManager: unique("unique_papercut_account_manager").on(
      table.papercutAccountId,
      table.managerId,
    ),
    managerIdIndex: index("manager_id_idx").on(table.managerId),
    papercutAccountIdIndex: index("papercut_account_id_idx").on(
      table.papercutAccountId,
    ),
  }),
);
export type PapercutAccountManagerAuthorizationsTable =
  typeof papercutAccountManagerAuthorizationsTable;
export type PapercutAccountManagerAuthorization =
  InferSelectModel<PapercutAccountManagerAuthorizationsTable>;
