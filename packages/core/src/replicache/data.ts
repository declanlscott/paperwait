import { Replicache } from ".";
import { Announcements } from "../announcements";
import { announcementsTable } from "../announcements/sql";
import { Comments } from "../comments";
import { commentsTable } from "../comments/sql";
import { Orders } from "../orders";
import { ordersTable } from "../orders/sql";
import { Papercut } from "../papercut";
import {
  papercutAccountCustomerAuthorizationsTable,
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import { Products } from "../products";
import { productsTable } from "../products/sql";
import { Rooms } from "../rooms";
import { roomsTable } from "../rooms/sql";
import { Tenants } from "../tenants";
import { tenantsTable } from "../tenants/sql";
import { Users } from "../users";
import { usersTable } from "../users/sql";
import { replicacheClientsTable } from "./sql";

import type * as v from "valibot";
import type { MutationName } from "./shared";

export const syncedTables = [
  announcementsTable,
  commentsTable,
  ordersTable,
  papercutAccountsTable,
  papercutAccountCustomerAuthorizationsTable,
  papercutAccountManagerAuthorizationsTable,
  productsTable,
  roomsTable,
  tenantsTable,
  usersTable,
];
export const nonSyncedTables = [replicacheClientsTable];
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
  [TName in TableName]: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: Array<any>
  ) => Promise<Array<Metadata<Extract<Table, { _: { name: TName } }>>>>;
};

export const metadataQueryFactory = {
  announcements: Announcements.metadata,
  comments: Comments.metadata,
  orders: Orders.metadata,
  papercut_accounts: Papercut.accountsMetadata,
  papercut_account_customer_authorizations:
    Papercut.accountCustomerAuthorizationsMetadata,
  papercut_account_manager_authorizations:
    Papercut.accountManagerAuthorizationsMetadata,
  products: Products.metadata,
  replicache_clients: Replicache.clientMetadataFromGroupId,
  rooms: Rooms.metadata,
  tenants: Tenants.metadata,
  users: Users.metadata,
} satisfies MetadataQueryFactory;

export type DataQueryFactory = {
  [TName in SyncedTableName]: (
    ids: Array<
      Extract<SyncedTable, { _: { name: TName } }>["$inferSelect"]["id"]
    >,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: Array<any>
  ) => Promise<
    Array<Extract<SyncedTable, { _: { name: TName } }>["$inferSelect"]>
  >;
};

export const dataQueryFactory = {
  announcements: Announcements.fromIds,
  comments: Comments.fromIds,
  orders: Orders.fromIds,
  papercut_accounts: Papercut.accountsFromIds,
  papercut_account_customer_authorizations:
    Papercut.accountCustomerAuthorizationsFromIds,
  papercut_account_manager_authorizations:
    Papercut.accountManagerAuthorizationsFromIds,
  products: Products.fromIds,
  rooms: Rooms.fromIds,
  tenants: Tenants.fromId,
  users: Users.fromIds,
} satisfies DataQueryFactory;

export type TablePatchData<TTable extends SyncedTable> = {
  puts: Array<TTable["$inferSelect"]>;
  dels: Array<TTable["$inferSelect"]["id"]>;
};

export type TableData = [
  SyncedTableName,
  TablePatchData<Extract<SyncedTable, { _: { name: SyncedTableName } }>>,
];

export type AuthoritativeMutator = <TSchema extends v.GenericSchema>(
  args: v.InferOutput<TSchema>,
) => Promise<void>;

export type AuthoritativeMutatorFactory = Record<
  MutationName,
  AuthoritativeMutator
>;

export const authoritativeMutatorFactory = {
  createAnnouncement: Announcements.create,
  updateAnnouncement: Announcements.update,
  deleteAnnouncement: Announcements.delete_,
  createComment: Comments.create,
  updateComment: Comments.update,
  deleteComment: Comments.delete_,
  createOrder: Orders.create,
  updateOrder: Orders.update,
  deleteOrder: Orders.delete_,
  createPapercutAccountManagerAuthorization:
    Papercut.createAccountManagerAuthorization,
  deletePapercutAccount: Papercut.deleteAccount,
  deletePapercutAccountManagerAuthorization:
    Papercut.deleteAccountManagerAuthorization,
  createProduct: Products.create,
  updateProduct: Products.update,
  deleteProduct: Products.delete_,
  createRoom: Rooms.create,
  updateRoom: Rooms.update,
  deleteRoom: Rooms.delete_,
  restoreRoom: Rooms.restore,
  updateTenant: Tenants.update,
  updateUserProfileRole: Users.updateProfileRole,
  deleteUserProfile: Users.deleteProfile,
  restoreUserProfile: Users.restoreProfile,
} satisfies AuthoritativeMutatorFactory;
