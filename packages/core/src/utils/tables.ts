import { announcementsTable } from "../announcements/sql";
import { commentsTable } from "../comments/sql";
import { invoicesTable } from "../invoices/sql";
import { ordersTable } from "../orders/sql";
import {
  papercutAccountCustomerAuthorizationsTable,
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import { productsTable } from "../products/sql";
import { replicacheClientsTable } from "../replicache/sql";
import {
  deliveryOptionsTable,
  roomsTable,
  workflowStatusesTable,
} from "../rooms/sql";
import { tenantsTable } from "../tenants/sql";
import { usersTable } from "../users/sql";

export const syncedTables = [
  announcementsTable,
  commentsTable,
  deliveryOptionsTable,
  invoicesTable,
  ordersTable,
  papercutAccountsTable,
  papercutAccountCustomerAuthorizationsTable,
  papercutAccountManagerAuthorizationsTable,
  productsTable,
  roomsTable,
  tenantsTable,
  usersTable,
  workflowStatusesTable,
];
export const nonSyncedTables = [replicacheClientsTable];
export const tables = [...syncedTables, ...nonSyncedTables];

export type SyncedTable = (typeof syncedTables)[number];
export type NonSyncedTable = (typeof nonSyncedTables)[number];
export type Table = SyncedTable | NonSyncedTable;

export type SyncedTableName = SyncedTable["_"]["name"];
export type NonSyncedTableName = NonSyncedTable["_"]["name"];
export type TableName = Table["_"]["name"];

export type TableByName<TTableName extends TableName> = Extract<
  Table,
  { _: { name: TTableName } }
>;
