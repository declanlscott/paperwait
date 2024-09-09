import { clientMetadataFromGroupId } from ".";
import * as Announcements from "../announcements";
import { announcements } from "../announcements/sql";
import * as Comments from "../comments";
import { comments } from "../comments/sql";
import * as Orders from "../orders";
import { orders } from "../orders/sql";
import * as Organizations from "../organizations";
import { organizations } from "../organizations/sql";
import * as Papercut from "../papercut";
import {
  papercutAccountCustomerAuthorizations,
  papercutAccountManagerAuthorizations,
  papercutAccounts,
} from "../papercut/sql";
import * as Products from "../products";
import { products } from "../products/sql";
import * as Rooms from "../rooms";
import { rooms } from "../rooms/sql";
import * as Users from "../users";
import { users } from "../users/sql";
import { replicacheClients } from "./sql";

import type * as v from "valibot";
import type { MutationName } from "./shared";

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
  [TName in TableName]: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: Array<any>
  ) => Promise<Array<Metadata<Extract<Table, { _: { name: TName } }>>>>;
};

export const metadataQueryFactory = {
  announcements: Announcements.metadata,
  comments: Comments.metadata,
  orders: Orders.metadata,
  organizations: Organizations.metadata,
  papercut_accounts: Papercut.accountsMetadata,
  papercut_account_customer_authorizations:
    Papercut.accountCustomerAuthorizationsMetadata,
  papercut_account_manager_authorizations:
    Papercut.accountManagerAuthorizationsMetadata,
  products: Products.metadata,
  replicache_clients: clientMetadataFromGroupId,
  rooms: Rooms.metadata,
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
  organizations: Organizations.fromId,
  papercut_accounts: Papercut.accountsFromIds,
  papercut_account_customer_authorizations:
    Papercut.accountCustomerAuthorizationsFromIds,
  papercut_account_manager_authorizations:
    Papercut.accountManagerAuthorizationsFromIds,
  products: Products.fromIds,
  rooms: Rooms.fromIds,
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
  updateOrganization: Organizations.update,
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
  updateUserRole: Users.updateRole,
  deleteUser: Users.delete_,
  restoreUser: Users.restore,
} satisfies AuthoritativeMutatorFactory;
