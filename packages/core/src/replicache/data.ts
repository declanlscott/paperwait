import { clientMetadataFromGroupId } from ".";
import * as Announcement from "../announcement";
import { announcements } from "../announcement/sql";
import * as Comment from "../comment";
import { comments } from "../comment/sql";
import * as Order from "../order";
import { orders } from "../order/sql";
import * as Organization from "../organization";
import { organizations } from "../organization/sql";
import * as Papercut from "../papercut";
import {
  papercutAccountCustomerAuthorizations,
  papercutAccountManagerAuthorizations,
  papercutAccounts,
} from "../papercut/sql";
import * as Product from "../product";
import { products } from "../product/sql";
import * as Room from "../room";
import { rooms } from "../room/sql";
import * as User from "../user";
import { users } from "../user/sql";
import { replicacheClients } from "./sql";

export const syncedTables = [
  announcements,
  comments,
  orders,
  organizations,
  papercutAccounts,
  papercutAccountCustomerAuthorizations,
  papercutAccountManagerAuthorizations,
  products,
  rooms,
  users,
];
export const nonSyncedTables = [replicacheClients];
export const tables = [...syncedTables, ...nonSyncedTables];

export type SyncedTable = (typeof syncedTables)[number];
export type NonSyncedTable = (typeof nonSyncedTables)[number];
export type Table = SyncedTable | NonSyncedTable;

export type SyncedTableName = SyncedTable["_"]["name"];
export type NonSyncedTableName = NonSyncedTable["_"]["name"];
export type TableName = Table["_"]["name"];

export type Metadata<
  TTable extends Table = Extract<Table, { _: { name: TableName } }>,
> = {
  id: TTable["$inferSelect"]["id"];
  rowVersion: number;
};

export type SyncedTableMetadata = [
  SyncedTableName,
  Array<Metadata<Extract<SyncedTable, { _: { name: SyncedTableName } }>>>,
];
export type NonSyncedTableMetadata = [
  NonSyncedTableName,
  Array<Metadata<Extract<NonSyncedTable, { _: { name: NonSyncedTableName } }>>>,
];
export type TableMetadata = [
  TableName,
  Array<Metadata<Extract<Table, { _: { name: TableName } }>>>,
];

export type MetadataQueryFactory = {
  [Name in TableName]: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: Array<any>
  ) => Promise<Array<Metadata<Extract<Table, { _: { name: Name } }>>>>;
};

export const metadataQueryFactory = {
  announcements: Announcement.metadata,
  comments: Comment.metadata,
  orders: Order.metadata,
  organizations: Organization.metadata,
  papercut_accounts: Papercut.accountsMetadata,
  papercut_account_customer_authorizations:
    Papercut.accountCustomerAuthorizationsMetadata,
  papercut_account_manager_authorizations:
    Papercut.accountManagerAuthorizationsMetadata,
  products: Product.metadata,
  replicache_clients: clientMetadataFromGroupId,
  rooms: Room.metadata,
  users: User.metadata,
} satisfies MetadataQueryFactory;

export type DataQueryFactory = {
  [Name in SyncedTableName]: (
    ids: Array<
      Extract<SyncedTable, { _: { name: Name } }>["$inferSelect"]["id"]
    >,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: Array<any>
  ) => Promise<
    Array<Extract<SyncedTable, { _: { name: Name } }>["$inferSelect"]>
  >;
};

export const dataQueryFactory = {
  announcements: Announcement.fromIds,
  comments: Comment.fromIds,
  orders: Order.fromIds,
  organizations: Organization.fromId,
  papercut_accounts: Papercut.accountsFromIds,
  papercut_account_customer_authorizations:
    Papercut.accountCustomerAuthorizationsFromIds,
  papercut_account_manager_authorizations:
    Papercut.accountManagerAuthorizationsFromIds,
  products: Product.fromIds,
  rooms: Room.fromIds,
  users: User.fromIds,
} satisfies DataQueryFactory;

export type PutsDels<TTable extends SyncedTable> = {
  puts: Array<TTable["$inferSelect"]>;
  dels: Array<TTable["$inferSelect"]["id"]>;
};

export type TableData = [
  SyncedTableName,
  PutsDels<Extract<SyncedTable, { _: { name: SyncedTableName } }>>,
];
