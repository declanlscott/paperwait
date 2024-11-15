import { Announcements } from "../announcements";
import { announcementsTableName } from "../announcements/shared";
import { Comments } from "../comments";
import { commentsTableName } from "../comments/shared";
import { Invoices } from "../invoices";
import { invoicesTableName } from "../invoices/shared";
import { Orders } from "../orders";
import { ordersTableName } from "../orders/shared";
import { Papercut } from "../papercut";
import {
  papercutAccountCustomerAuthorizationsTableName,
  papercutAccountManagerAuthorizationsTableName,
  papercutAccountsTableName,
} from "../papercut/shared";
import { Products } from "../products";
import { productsTableName } from "../products/shared";
import { Rooms } from "../rooms";
import {
  deliveryOptionsTableName,
  roomsTableName,
  workflowStatusesTableName,
} from "../rooms/shared";
import { Tenants } from "../tenants";
import { tenantsTableName } from "../tenants/shared";
import { Users } from "../users";
import { usersTableName } from "../users/shared";

import type * as v from "valibot";
import type {
  NonSyncedTableName,
  SyncedTable,
  SyncedTableName,
  Table,
  TableByName,
  TableName,
} from "../utils/tables";
import type { MutationName } from "./shared";

export type Metadata<TTable extends Table = TableByName<TableName>> = {
  id: TTable["$inferSelect"]["id"];
  rowVersion: number;
};

export type SyncedTableMetadata = [
  SyncedTableName,
  Array<Metadata<TableByName<SyncedTableName>>>,
];
export type NonSyncedTableMetadata = [
  NonSyncedTableName,
  Array<Metadata<TableByName<NonSyncedTableName>>>,
];
export type TableMetadata = [
  TableName,
  Array<Metadata<TableByName<TableName>>>,
];

export type DataFactory = {
  [TName in SyncedTableName]: (
    ids: Array<TableByName<TName>["$inferSelect"]["id"]>,
  ) => Promise<Array<TableByName<TName>["$inferSelect"]>>;
};

export const dataFactory = {
  [announcementsTableName]: Announcements.read,
  [commentsTableName]: Comments.read,
  [deliveryOptionsTableName]: Rooms.readDeliveryOptions,
  [invoicesTableName]: Invoices.read,
  [ordersTableName]: Orders.read,
  [papercutAccountsTableName]: Papercut.readAccounts,
  [papercutAccountCustomerAuthorizationsTableName]:
    Papercut.readAccountCustomerAuthorizations,
  [papercutAccountManagerAuthorizationsTableName]:
    Papercut.readAccountManagerAuthorizations,
  [productsTableName]: Products.read,
  [roomsTableName]: Rooms.read,
  [tenantsTableName]: Tenants.read,
  [usersTableName]: Users.read,
  [workflowStatusesTableName]: Rooms.readWorkflow,
} satisfies DataFactory;

export type TablePatchData<TTable extends SyncedTable> = {
  puts: Array<TTable["$inferSelect"]>;
  dels: Array<TTable["$inferSelect"]["id"]>;
};

export type TableData = [
  SyncedTableName,
  TablePatchData<TableByName<SyncedTableName>>,
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
  setDeliveryOptions: Rooms.setDeliveryOptions,
  createInvoice: Invoices.create,
  createOrder: Orders.create,
  updateOrder: Orders.update,
  deleteOrder: Orders.delete_,
  updatePapercutAccountApprovalThreshold:
    Papercut.updateAccountApprovalThreshold,
  deletePapercutAccount: Papercut.deleteAccount,
  createPapercutAccountManagerAuthorization:
    Papercut.createAccountManagerAuthorization,
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
  setWorkflow: Rooms.setWorkflow,
} satisfies AuthoritativeMutatorFactory;
