import {
  bigint,
  foreignKey,
  pgTable,
  primaryKey,
  text,
  unique,
} from "drizzle-orm/pg-core";

import { id, timestamps } from "../drizzle/columns";
import { orgIdColumns, orgTable } from "../drizzle/tables";
import { User } from "../user/user.sql";

export const PapercutAccount = pgTable(
  "papercut_account",
  {
    id: bigint("id", { mode: "number" }).notNull(),
    orgId: orgIdColumns.orgId,
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.orgId] }),
    uniqueName: unique("unique_name").on(table.name, table.orgId),
  }),
);
export type PapercutAccount = typeof PapercutAccount.$inferSelect;

export const PapercutAccountCustomerAuthorization = orgTable(
  "papercut_account_customer_authorization",
  {
    customerId: id("customer_id").notNull(),
    papercutAccountId: bigint("papercut_account_id", {
      mode: "number",
    }).notNull(),
  },
  (table) => ({
    customerReference: foreignKey({
      columns: [table.customerId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "user_fk",
    }),
    papercutAccountReference: foreignKey({
      columns: [table.papercutAccountId, table.orgId],
      foreignColumns: [PapercutAccount.id, PapercutAccount.orgId],
      name: "papercut_account_fk",
    }),
    uniquePapercutAccountCustomer: unique(
      "unique_papercut_account_customer",
    ).on(table.papercutAccountId, table.customerId),
  }),
);
export type PapercutAccountCustomerAuthorization =
  typeof PapercutAccountCustomerAuthorization.$inferSelect;

export const PapercutAccountManagerAuthorization = orgTable(
  "papercut_account_manager_authorization",
  {
    managerId: id("manager_id").notNull(),
    papercutAccountId: bigint("papercut_account_id", {
      mode: "number",
    }).notNull(),
  },
  (table) => ({
    managerReference: foreignKey({
      columns: [table.managerId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "manager_fk",
    }),
    papercutAccountReference: foreignKey({
      columns: [table.papercutAccountId, table.orgId],
      foreignColumns: [PapercutAccount.id, PapercutAccount.orgId],
      name: "papercut_account_fk",
    }),
    uniquePapercutAccountManager: unique("unique_papercut_account_manager").on(
      table.papercutAccountId,
      table.managerId,
    ),
  }),
);
export type PapercutAccountManagerAuthorization =
  typeof PapercutAccountManagerAuthorization.$inferSelect;
