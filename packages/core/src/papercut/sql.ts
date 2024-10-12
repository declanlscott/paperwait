import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  unique,
} from "drizzle-orm/pg-core";

import { bigintString, id, timestamps } from "../drizzle/columns";
import { tenantIdColumns, tenantTable } from "../drizzle/tables";
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
    tenantId: tenantIdColumns.tenantId,
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.tenantId] }),
    uniqueName: unique("unique_name").on(table.name, table.tenantId),
  }),
);
export type PapercutAccountsTable = typeof papercutAccountsTable;
export type PapercutAccount = InferSelectModel<PapercutAccountsTable>;

export const papercutAccountCustomerAuthorizationsTable = tenantTable(
  papercutAccountCustomerAuthorizationsTableName,
  {
    customerId: id("customer_id").notNull(),
    papercutAccountId: bigintString("papercut_account_id").notNull(),
  },
  (table) => ({
    customerReference: foreignKey({
      columns: [table.customerId, table.tenantId],
      foreignColumns: [usersTable.id, usersTable.tenantId],
      name: "user_fk",
    }).onDelete("cascade"),
    papercutAccountReference: foreignKey({
      columns: [table.papercutAccountId, table.tenantId],
      foreignColumns: [
        papercutAccountsTable.id,
        papercutAccountsTable.tenantId,
      ],
      name: "papercut_account_fk",
    }).onDelete("cascade"),
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

export const papercutAccountManagerAuthorizationsTable = tenantTable(
  papercutAccountManagerAuthorizationsTableName,
  {
    managerId: id("manager_id").notNull(),
    papercutAccountId: bigintString("papercut_account_id").notNull(),
  },
  (table) => ({
    managerReference: foreignKey({
      columns: [table.managerId, table.tenantId],
      foreignColumns: [usersTable.id, usersTable.tenantId],
      name: "manager_fk",
    }).onDelete("cascade"),
    papercutAccountReference: foreignKey({
      columns: [table.papercutAccountId, table.tenantId],
      foreignColumns: [
        papercutAccountsTable.id,
        papercutAccountsTable.tenantId,
      ],
      name: "papercut_account_fk",
    }).onDelete("cascade"),
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
